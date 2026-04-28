import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EZCOUNT_API_URL = "https://api.ezcount.co.il/api/createDoc";

const DOC_TYPE_MAP: Record<string, number> = {
  tax_invoice: 305,
  invoice_receipt: 320,
  receipt: 400,
  delivery_note: 200,
};

const PAYMENT_TYPE_MAP: Record<string, number> = {
  cash: 1,
  credit: 3,
  bit: 91,
  bank_transfer: 4,
};

async function getEzcountConfig(supabase: any): Promise<{ api_key: string; developer_email: string }> {
  const { data } = await supabase
    .from("site_content")
    .select("content")
    .eq("page", "settings")
    .eq("section", "ezcount")
    .maybeSingle();

  const content = data?.content as Record<string, string> | null;
  const api_key = content?.api_key || Deno.env.get("EZCOUNT_API_KEY") || "";
  const developer_email = content?.developer_email || "elwejha.outdoors@gmail.com";

  return { api_key, developer_email };
}

function generateShortCode(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { api_key, developer_email } = await getEzcountConfig(supabase);
    if (!api_key) throw new Error("EZCOUNT_API_KEY is not configured");

    const body = await req.json();
    const {
      doc_type,
      order_id,
      customer_name,
      customer_email,
      customer_phone,
      items,
      payments,
      description,
      comment,
      dont_send_email,
      shipping_cost,
      discount_amount,
    } = body;

    const typeNum = DOC_TYPE_MAP[doc_type];
    if (!typeNum) throw new Error(`Invalid doc_type: ${doc_type}`);

    // Build EZCount request
    const ezBody: Record<string, unknown> = {
      api_key,
      developer_email,
      type: typeNum,
      customer_name,
      dont_send_email: dont_send_email ? 1 : 0,
    };

    if (customer_email) ezBody.customer_email = customer_email;
    if (customer_phone) ezBody.customer_phone = customer_phone;
    if (description) ezBody.description = description;
    if (comment) ezBody.comment = comment;

    // Items
    if (items && items.length > 0) {
      const itemsList = items.map((i: { details: string; amount: number; price: number; catalog_number?: string }) => ({
        details: i.details,
        amount: i.amount,
        price: i.price,
        ...(i.catalog_number ? { catalog_number: i.catalog_number } : {}),
      }));

      // Add shipping as a line item if present (so price_total matches payments)
      const shipping = Number(shipping_cost) || 0;
      if (shipping > 0) {
        itemsList.push({
          details: "דמי משלוח",
          amount: 1,
          price: shipping,
          catalog_number: "SHIPPING",
        });
      }

      // Add discount as a negative line item so price_total matches payments
      const discount = Number(discount_amount) || 0;
      if (discount > 0) {
        itemsList.push({
          details: "הנחה",
          amount: 1,
          price: -discount,
          catalog_number: "DISCOUNT",
        });
      }

      ezBody.item = itemsList;
    }

    // Payments (required for receipt and invoice_receipt)
    if (payments && payments.length > 0) {
      ezBody.payment = payments.map((p: { type: string; amount: number; comment?: string }) => ({
        payment_type: PAYMENT_TYPE_MAP[p.type] || 9,
        payment: p.amount,
        ...(p.comment ? { comment: p.comment } : {}),
      }));
    }

    // For invoice_receipt, price_total and tax_included are mandatory
    if (typeNum === 320 && items && items.length > 0) {
      const itemsTotal = items.reduce((sum: number, i: { amount: number; price: number }) => sum + i.amount * i.price, 0);
      const shipping = Number(shipping_cost) || 0;
      const discount = Number(discount_amount) || 0;
      ezBody.price_total = itemsTotal + shipping - discount;
      ezBody.tax_included = 1;

      // Pre-flight validation: ensure price_total matches sum of payments,
      // otherwise EZCount will reject with errNum 220.7. Better to fail
      // here with a clear, actionable error than to log a generic API error.
      if (payments && payments.length > 0) {
        const paymentsTotal = payments.reduce(
          (sum: number, p: { amount: number }) => sum + Number(p.amount),
          0,
        );
        const diff = Math.round((Number(ezBody.price_total) - paymentsTotal) * 100) / 100;
        if (Math.abs(diff) > 0.01) {
          const msg =
            `סכום המסמך (₪${Number(ezBody.price_total).toFixed(2)}) ` +
            `לא תואם את סכום התשלומים (₪${paymentsTotal.toFixed(2)}). ` +
            `פער: ₪${diff.toFixed(2)}. ` +
            `בדוק שההנחה (${discount}) והמשלוח (${shipping}) נשלחו נכון.`;
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    console.log("Sending to EZCount:", JSON.stringify(ezBody, null, 2));

    const ezResponse = await fetch(EZCOUNT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ezBody),
    });

    const ezData = await ezResponse.json();
    console.log("EZCount response:", JSON.stringify(ezData));

    // Calculate total
    const itemsTotalCalc = items
      ? items.reduce((sum: number, i: { amount: number; price: number }) => sum + i.amount * i.price, 0)
      : 0;
    const total =
      itemsTotalCalc + (Number(shipping_cost) || 0) - (Number(discount_amount) || 0);

    if (ezResponse.ok && !ezData.errMsg) {
      // Generate short code for the document
      const shortCode = generateShortCode();

      // Success - save document with short_code
      const { data: doc, error: dbError } = await supabase.from("documents").insert({
        order_id: order_id || null,
        doc_type: typeNum,
        doc_number: ezData.doc_number?.toString(),
        doc_uuid: ezData.doc_uuid,
        doc_url: ezData.pdf_link || ezData.doc_url,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        total,
        status: "issued",
        short_code: shortCode,
      }).select().single();

      if (dbError) console.error("DB save error:", dbError);

      return new Response(JSON.stringify({
        success: true,
        doc_number: ezData.doc_number,
        doc_uuid: ezData.doc_uuid,
        doc_url: ezData.pdf_link || ezData.doc_url,
        short_code: shortCode,
        document: doc,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Error - save with error status
      const errMsg = ezData.errMsg || ezData.error || "Unknown EZCount error";
      
      await supabase.from("documents").insert({
        order_id: order_id || null,
        doc_type: typeNum,
        customer_name,
        customer_email: customer_email || null,
        customer_phone: customer_phone || null,
        total,
        status: "error",
        error_message: errMsg,
      });

      return new Response(JSON.stringify({
        success: false,
        error: errMsg,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Edge function error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

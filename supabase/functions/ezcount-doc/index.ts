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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EZCOUNT_API_KEY = Deno.env.get("EZCOUNT_API_KEY");
    if (!EZCOUNT_API_KEY) throw new Error("EZCOUNT_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    } = body;

    const typeNum = DOC_TYPE_MAP[doc_type];
    if (!typeNum) throw new Error(`Invalid doc_type: ${doc_type}`);

    // Build EZCount request
    const ezBody: Record<string, unknown> = {
      api_key: EZCOUNT_API_KEY,
      developer_email: "dev@elwejha.com",
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
      ezBody.item = items.map((i: { details: string; amount: number; price: number; catalog_number?: string }) => ({
        details: i.details,
        amount: i.amount,
        price: i.price,
        ...(i.catalog_number ? { catalog_number: i.catalog_number } : {}),
      }));
    }

    // Payments (required for receipt and invoice_receipt)
    if (payments && payments.length > 0) {
      ezBody.payment = payments.map((p: { type: string; amount: number; comment?: string }) => ({
        payment_type: PAYMENT_TYPE_MAP[p.type] || 9,
        payment_sum: p.amount,
        ...(p.comment ? { comment: p.comment } : {}),
      }));
    }

    // For invoice_receipt, price_total is mandatory
    if (typeNum === 320 && items && items.length > 0) {
      const total = items.reduce((sum: number, i: { amount: number; price: number }) => sum + i.amount * i.price, 0);
      ezBody.price_total = total;
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
    const total = items
      ? items.reduce((sum: number, i: { amount: number; price: number }) => sum + i.amount * i.price, 0)
      : 0;

    if (ezResponse.ok && !ezData.errMsg) {
      // Success - save document
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
      }).select().single();

      if (dbError) console.error("DB save error:", dbError);

      return new Response(JSON.stringify({
        success: true,
        doc_number: ezData.doc_number,
        doc_uuid: ezData.doc_uuid,
        doc_url: ezData.pdf_link || ezData.doc_url,
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

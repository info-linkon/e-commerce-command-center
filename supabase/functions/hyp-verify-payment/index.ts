const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read HYP config
    const { data: configRow } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "hyp")
      .maybeSingle();

    if (!configRow?.content) {
      return new Response(JSON.stringify({ error: "HYP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configRow.content as Record<string, string>;
    const { masof, api_key, passp } = config;

    const body = await req.json();
    const { Id, CCode, Amount, ACode, Order, Fild1, Fild2, Fild3, Sign, Bank, Payments, UserId, Brand, Issuer, L4digit, street, city, zip, cell, Coin, Tmonth, Tyear, errMsg, Hesh, order_id } = body;

    // ── Idempotency: if this transaction was already processed, return success without duplicating ──
    if (order_id && Id) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("hyp_transaction_id")
        .eq("id", order_id)
        .maybeSingle();

      if (existingOrder?.hyp_transaction_id === Id) {
        console.log(`HYP transaction ${Id} already processed for order ${order_id} — skipping`);
        return new Response(JSON.stringify({ verified: true, CCode: "0", already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also check payments table for duplicate reference
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("order_id", order_id)
        .eq("reference", `HYP-${Id}`)
        .maybeSingle();

      if (existingPayment) {
        console.log(`Payment with reference HYP-${Id} already exists — skipping`);
        return new Response(JSON.stringify({ verified: true, CCode: "0", already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build verification URL
    const verifyParams = new URLSearchParams({
      action: "APISign",
      What: "VERIFY",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
    });

    if (Id) verifyParams.set("Id", Id);
    if (CCode !== undefined) verifyParams.set("CCode", String(CCode));
    if (Amount) verifyParams.set("Amount", String(Amount));
    if (ACode) verifyParams.set("ACode", ACode);
    if (Order) verifyParams.set("Order", Order);
    if (Fild1) verifyParams.set("Fild1", Fild1);
    if (Fild2) verifyParams.set("Fild2", Fild2);
    if (Fild3 !== undefined) verifyParams.set("Fild3", Fild3 || "");
    if (Sign) verifyParams.set("Sign", Sign);
    if (Bank) verifyParams.set("Bank", String(Bank));
    if (Payments) verifyParams.set("Payments", String(Payments));
    if (UserId) verifyParams.set("UserId", UserId);
    if (Brand) verifyParams.set("Brand", String(Brand));
    if (Issuer) verifyParams.set("Issuer", String(Issuer));
    if (L4digit) verifyParams.set("L4digit", L4digit);
    if (street) verifyParams.set("street", street);
    if (city) verifyParams.set("city", city);
    if (zip) verifyParams.set("zip", zip);
    if (cell) verifyParams.set("cell", cell);
    if (Coin) verifyParams.set("Coin", String(Coin));
    if (Tmonth) verifyParams.set("Tmonth", Tmonth);
    if (Tyear) verifyParams.set("Tyear", Tyear);
    if (errMsg) verifyParams.set("errMsg", errMsg);
    if (Hesh) verifyParams.set("Hesh", Hesh);

    const verifyUrl = `https://pay.hyp.co.il/p/?${verifyParams.toString()}`;
    console.log("HYP Verify URL:", verifyUrl);

    const verifyResponse = await fetch(verifyUrl);
    const verifyResult = await verifyResponse.text();
    console.log("HYP Verify response:", verifyResult);

    const resultParams = new URLSearchParams(verifyResult);
    const resultCCode = resultParams.get("CCode");

    if (resultCCode === "0") {
      if (order_id) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("total, customer_name, customer_email, customer_phone")
          .eq("id", order_id)
          .single();

        await supabase
          .from("orders")
          .update({
            status: "pending",
            payment_method: "credit",
            hyp_transaction_id: Id || null,
          })
          .eq("id", order_id);

        if (orderData) {
          await supabase.from("payments").insert({
            order_id,
            amount: orderData.total,
            payment_method: "credit",
            reference: `HYP-${Id || ""}`,
          });

          // Auto-issue invoice receipt (type 320)
          try {
            const { data: orderItems } = await supabase
              .from("order_items")
              .select("quantity, unit_price, variation_id, product_variations(name, sku, products(name))")
              .eq("order_id", order_id);

            const items = (orderItems || []).map((oi: any) => ({
              details: `${oi.product_variations?.products?.name || ""} - ${oi.product_variations?.name || ""}`.trim().replace(/^- /, ""),
              amount: oi.quantity,
              price: Number(oi.unit_price),
              catalog_number: oi.product_variations?.sku || undefined,
            }));

            const ezRes = await fetch(`${supabaseUrl}/functions/v1/ezcount-doc`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                doc_type: "invoice_receipt",
                order_id,
                customer_name: orderData.customer_name || "לקוח אתר",
                customer_email: orderData.customer_email || undefined,
                customer_phone: orderData.customer_phone || undefined,
                items,
                payments: [{ type: "credit", amount: Number(orderData.total) }],
              }),
            });

            const ezData = await ezRes.json();
            console.log("EZCount auto-invoice result:", JSON.stringify(ezData));

            if (ezData.success) {
              const invoiceLink = ezData.short_code
                ? `/inv/${ezData.short_code}`
                : ezData.doc_url;
              if (invoiceLink) {
                await supabase
                  .from("orders")
                  .update({ invoice_url: invoiceLink })
                  .eq("id", order_id);
              }
            }
          } catch (ezErr) {
            console.error("Auto-invoice error (non-blocking):", ezErr);
          }

          // Trigger SMS
          try {
            await fetch(`${supabaseUrl}/functions/v1/order-sms-trigger`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ order_id, trigger_type: "order_completed" }),
            });
          } catch (smsErr) {
            console.error("SMS trigger error (non-blocking):", smsErr);
          }

          // Trigger email
          try {
            await fetch(`${supabaseUrl}/functions/v1/order-email-notify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ order_id }),
            });
          } catch (emailErr) {
            console.error("Email notify error (non-blocking):", emailErr);
          }
        }
      }

      return new Response(JSON.stringify({ verified: true, CCode: "0" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ verified: false, CCode: resultCCode, raw: verifyResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("HYP verify error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

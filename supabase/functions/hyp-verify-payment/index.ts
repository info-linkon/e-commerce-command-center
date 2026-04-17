const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HYP_ENDPOINT = "https://pay.hyp.co.il/p/";

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function verifyWithRetry(url: string): Promise<{ ok: boolean; body: string }> {
  const delays = [0, 1000, 2500];
  let lastBody = "";
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const res = await fetchWithTimeout(url, 15000);
      const body = await res.text();
      lastBody = body;
      // A valid response — even if CCode != 0 — should contain a CCode param.
      // Only retry on network/HTTP failures, not on logical "wrong signature" responses.
      if (res.ok && body.includes("CCode=")) {
        return { ok: true, body };
      }
    } catch (err) {
      lastBody = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, body: lastBody };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { Id, CCode, Amount, ACode, Order, Fild1, Fild2, Fild3, Sign, Bank, Payments, UserId, Brand, Issuer, L4digit, street, city, zip, cell, Coin, Tmonth, Tyear, errMsg, Hesh, order_id: reqOrderId } = body;

    // Resolve order_id: prefer the one sent from the client,
    // but fall back to looking up by the HYP Order param (= our order_number).
    let order_id: string | null = reqOrderId || null;
    if (!order_id && Order) {
      const orderNumber = Number(Order);
      if (Number.isFinite(orderNumber)) {
        const { data: byNumber } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", orderNumber)
          .maybeSingle();
        order_id = byNumber?.id ?? null;
      }
    }

    // ── Idempotency: if this transaction was already processed, return success without duplicating ──
    if (order_id && Id) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("hyp_transaction_id")
        .eq("id", order_id)
        .maybeSingle();

      if (existingOrder?.hyp_transaction_id && String(existingOrder.hyp_transaction_id) === String(Id)) {
        console.log(`HYP transaction ${Id} already processed for order ${order_id} — skipping`);
        return new Response(JSON.stringify({ verified: true, CCode: "0", already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

    // Fast-fail: if the callback already reports a non-success CCode,
    // don't call VERIFY — just report the error back to the client.
    // (CCode=0=success; 600/700/800 are documented "grey" statuses → still treat as not-paid)
    if (CCode !== undefined && CCode !== null && String(CCode) !== "0") {
      console.log(`HYP callback reports CCode=${CCode} for order ${order_id ?? "(unknown)"} — payment not successful`);
      return new Response(JSON.stringify({
        verified: false,
        CCode: String(CCode),
        errMsg: errMsg || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build VERIFY request — send every callback param back to HYP verbatim
    const verifyParams = new URLSearchParams({
      action: "APISign",
      What: "VERIFY",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
    });

    const passthrough: Record<string, unknown> = {
      Id, CCode, Amount, ACode, Order, Fild1, Fild2, Fild3, Sign, Bank, Payments,
      UserId, Brand, Issuer, L4digit, street, city, zip, cell, Coin, Tmonth, Tyear,
      errMsg, Hesh,
    };
    for (const [k, v] of Object.entries(passthrough)) {
      if (v !== undefined && v !== null && v !== "") verifyParams.set(k, String(v));
      else if (k === "Fild3" && v !== undefined) verifyParams.set(k, ""); // keep empty Fild3 if sent
    }

    const verifyUrl = `${HYP_ENDPOINT}?${verifyParams.toString()}`;
    console.log("HYP Verify call for order", order_id, "tx", Id);

    const verifyResult = await verifyWithRetry(verifyUrl);
    if (!verifyResult.ok) {
      console.error("HYP VERIFY unreachable:", verifyResult.body);
      return new Response(JSON.stringify({
        verified: false,
        CCode: "network_error",
        error: "Could not reach HYP verification endpoint",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultParams = new URLSearchParams(verifyResult.body);
    const resultCCode = resultParams.get("CCode");

    if (resultCCode !== "0") {
      console.warn("HYP VERIFY rejected signature:", resultCCode, verifyResult.body);
      return new Response(JSON.stringify({
        verified: false,
        CCode: resultCCode ?? "unknown",
        raw: verifyResult.body.slice(0, 500),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Signature verified. Now validate amount before marking as paid. ──
    if (!order_id) {
      // Signature is valid but we can't locate the order in our DB.
      // Log loudly — this is a data integrity issue — but report verified=true
      // so the user sees a "received" state. Staff can reconcile manually.
      console.error("HYP VERIFY OK but order not found. Id=", Id, "Order=", Order);
      return new Response(JSON.stringify({
        verified: true,
        CCode: "0",
        warning: "order_not_found",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orderData } = await supabase
      .from("orders")
      .select("id, total, customer_name, customer_email, customer_phone, status, hyp_transaction_id")
      .eq("id", order_id)
      .single();

    if (!orderData) {
      console.error("HYP VERIFY OK but order row missing:", order_id);
      return new Response(JSON.stringify({
        verified: true,
        CCode: "0",
        warning: "order_row_missing",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Amount check — protect against tampered callbacks
    const callbackAmount = Amount !== undefined && Amount !== null ? Number(Amount) : NaN;
    const orderAmount = Number(orderData.total);
    if (Number.isFinite(callbackAmount) && Math.abs(callbackAmount - orderAmount) > 0.01) {
      console.error(`HYP amount mismatch for order ${order_id}: callback=${callbackAmount}, order=${orderAmount}`);
      return new Response(JSON.stringify({
        verified: false,
        CCode: "amount_mismatch",
        error: `Amount mismatch (expected ${orderAmount}, got ${callbackAmount})`,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Second idempotency guard (in case two callbacks raced past the first check)
    if (orderData.hyp_transaction_id && String(orderData.hyp_transaction_id) === String(Id)) {
      return new Response(JSON.stringify({ verified: true, CCode: "0", already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as paid — preserve existing status if already past "pending_payment"
    const nextStatus = orderData.status === "pending_payment" ? "pending" : orderData.status;
    await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_method: "credit",
        hyp_transaction_id: Id || null,
      })
      .eq("id", order_id);

    await supabase.from("payments").insert({
      order_id,
      amount: orderData.total,
      payment_method: "credit",
      reference: `HYP-${Id || ""}`,
    });

    // Auto-issue invoice receipt (type 320) — non-blocking
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
        const invoiceLink = ezData.short_code ? `/inv/${ezData.short_code}` : ezData.doc_url;
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

    // Trigger SMS — non-blocking
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

    // Trigger email — non-blocking
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

    return new Response(JSON.stringify({
      verified: true,
      CCode: "0",
      order_id,
      last4: L4digit || null,
      brand: Brand ?? null,
      payments: Payments ?? null,
    }), {
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

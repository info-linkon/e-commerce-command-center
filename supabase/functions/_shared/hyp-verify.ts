// Shared HYP verification logic. Called from:
//   - hyp-verify-payment  (client-initiated from /order-confirmation after browser redirect)
//   - hyp-notify          (server-to-server callback from HYP Notify URL)
//
// Blueprint references:
//   - docs/hypay.apib §"Step 2 - APISign Verify" — action=APISign&What=VERIFY
//   - docs/hypay.apib §"Returned parameters" — Amount is the amount actually charged (Coin=1 → ILS)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface HypCallbackParams {
  Id?: string;
  CCode?: string;
  Amount?: string;
  ACode?: string;
  Order?: string;
  Fild1?: string;
  Fild2?: string;
  Fild3?: string;
  Sign?: string;
  Bank?: string;
  Payments?: string;
  UserId?: string;
  Brand?: string;
  Issuer?: string;
  L4digit?: string;
  street?: string;
  city?: string;
  zip?: string;
  cell?: string;
  Coin?: string;
  Tmonth?: string;
  Tyear?: string;
  errMsg?: string;
  Hesh?: string;
}

export interface HypVerifyInput extends HypCallbackParams {
  order_id?: string;
}

export interface HypVerifyResult {
  verified: boolean;
  CCode?: string;
  already_processed?: boolean;
  amount_mismatch?: boolean;
  reason?: string;
  raw?: string;
}

async function logEvent(
  supabase: SupabaseClient,
  order_id: string | undefined,
  event_type: string,
  success: boolean,
  message?: string,
  metadata?: Record<string, unknown>,
) {
  if (!order_id) return;
  try {
    await supabase.from("payment_events").insert({
      order_id,
      event_type,
      success,
      message: message || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("payment_events insert failed (non-blocking):", err);
  }
}

export async function runHypVerify(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  input: HypVerifyInput,
  source: "redirect" | "notify",
): Promise<HypVerifyResult> {
  const { order_id, ...hyp } = input;
  const { Id, CCode, Amount, ACode, Order, Fild1, Fild2, Fild3, Sign, Bank, Payments, UserId, Brand, Issuer, L4digit, street, city, zip, cell, Coin, Tmonth, Tyear, errMsg, Hesh } = hyp;

  // Read HYP config
  const { data: configRow } = await supabase
    .from("site_content")
    .select("content")
    .eq("page", "settings")
    .eq("section", "hyp")
    .maybeSingle();

  if (!configRow?.content) {
    return { verified: false, reason: "hyp_not_configured" };
  }

  const config = configRow.content as Record<string, string>;
  const { masof, api_key, passp } = config;

  // ── Idempotency pre-check (fast path) ──
  // Final idempotency is guaranteed by the DB unique index on payments(order_id, reference)
  // and a 23505 catch on insert, but this pre-check avoids hitting HYP when we already know the answer.
  let resolvedOrderId = order_id || null;
  if (!resolvedOrderId && Order) {
    const { data: row } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", Number(Order))
      .maybeSingle();
    resolvedOrderId = row?.id || null;
  }

  if (resolvedOrderId && Id) {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("hyp_transaction_id")
      .eq("id", resolvedOrderId)
      .maybeSingle();

    if (existingOrder?.hyp_transaction_id === Id) {
      return { verified: true, CCode: "0", already_processed: true };
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", resolvedOrderId)
      .eq("reference", `HYP-${Id}`)
      .maybeSingle();

    if (existingPayment) {
      return { verified: true, CCode: "0", already_processed: true };
    }
  }

  // Build HYP VERIFY request
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
  const verifyResponse = await fetch(verifyUrl);
  const verifyResult = await verifyResponse.text();

  const resultParams = new URLSearchParams(verifyResult);
  const resultCCode = resultParams.get("CCode");

  if (resultCCode !== "0") {
    await logEvent(supabase, resolvedOrderId || undefined, `hyp_verify_${source}`, false, `CCode=${resultCCode}`, { raw: verifyResult });
    return { verified: false, CCode: resultCCode || undefined, raw: verifyResult };
  }

  if (!resolvedOrderId) {
    // Can't update anything without an order context; return verified but flag
    return { verified: true, CCode: "0" };
  }

  // Fetch order for amount check + side-effects
  const { data: orderData } = await supabase
    .from("orders")
    .select("total, customer_name, customer_email, customer_phone, source")
    .eq("id", resolvedOrderId)
    .single();

  if (!orderData) {
    return { verified: true, CCode: "0" };
  }

  // ── Amount verification (Coin=1 → ILS, Amount is actually charged) ──
  const chargedAmount = Number(Amount || 0);
  const orderTotal = Number(orderData.total);
  if (!isFinite(chargedAmount) || Math.abs(chargedAmount - orderTotal) > 0.01) {
    await logEvent(supabase, resolvedOrderId, "hyp_amount_mismatch", false, `charged=${chargedAmount} total=${orderTotal}`, { Id, source });
    await supabase
      .from("orders")
      .update({ woo_sync_error: `HYP amount mismatch: charged ₪${chargedAmount}, order total ₪${orderTotal}` })
      .eq("id", resolvedOrderId);
    return { verified: false, CCode: "0", amount_mismatch: true, reason: "amount_mismatch" };
  }

  return applyHypSuccess(supabase, supabaseUrl, supabaseKey, {
    orderId: resolvedOrderId,
    hypId: Id || null,
    amount: chargedAmount,
    orderSource: orderData.source,
    customerName: orderData.customer_name,
    customerEmail: orderData.customer_email,
    customerPhone: orderData.customer_phone,
    source,
  });
}

export interface ApplyHypSuccessInput {
  orderId: string;
  hypId: string | null;
  amount: number;
  orderSource?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  // Origin of the success signal, used only for event_type naming in payment_events.
  source: "redirect" | "notify" | "manual_reconcile";
}

/**
 * Apply all side-effects of a confirmed HYP payment: mark the order processing,
 * insert the payment row (idempotent via unique index), issue invoice, send SMS/email,
 * and sync to WooCommerce. Shared between the automated verify path and the
 * admin-initiated `hyp-reconcile` path, so both produce identical state.
 */
export async function applyHypSuccess(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  input: ApplyHypSuccessInput,
): Promise<HypVerifyResult> {
  const { orderId, hypId, amount, orderSource, customerName, customerEmail, customerPhone, source } = input;

  await supabase
    .from("orders")
    .update({
      status: "processing",
      hyp_transaction_id: hypId,
      payment_link_url: null,
    })
    .eq("id", orderId);

  const paymentInsert = await supabase.from("payments").insert({
    order_id: orderId,
    amount,
    payment_method: "credit",
    reference: `HYP-${hypId || ""}`,
  });

  if (paymentInsert.error) {
    const code = (paymentInsert.error as { code?: string }).code;
    if (code === "23505") {
      await logEvent(supabase, orderId, `hyp_verify_${source}`, true, "duplicate_ignored", { Id: hypId });
      return { verified: true, CCode: "0", already_processed: true };
    }
    await logEvent(supabase, orderId, "hyp_payment_insert_failed", false, paymentInsert.error.message, { Id: hypId });
    return { verified: false, CCode: "0", reason: "payment_insert_failed" };
  }

  await logEvent(supabase, orderId, `hyp_verify_${source}`, true, "payment_recorded", { Id: hypId, amount });

  try {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, variation_id, product_variations(name, sku, products(name))")
      .eq("order_id", orderId);

    type OrderItemRow = {
      quantity: number;
      unit_price: number;
      product_variations?: { name?: string | null; sku?: string | null; products?: { name?: string | null } | null } | null;
    };
    const items = ((orderItems as OrderItemRow[] | null) || []).map((oi) => ({
      details: `${oi.product_variations?.products?.name || ""} - ${oi.product_variations?.name || ""}`.trim().replace(/^- /, ""),
      amount: oi.quantity,
      price: Number(oi.unit_price),
      catalog_number: oi.product_variations?.sku || undefined,
    }));

    const ezRes = await fetch(`${supabaseUrl}/functions/v1/ezcount-doc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        doc_type: "invoice_receipt",
        order_id: orderId,
        customer_name: customerName || "לקוח אתר",
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        items,
        payments: [{ type: "credit", amount }],
      }),
    });

    const ezData = await ezRes.json();
    if (ezData.success) {
      const invoiceLink = ezData.short_code ? `/inv/${ezData.short_code}` : ezData.doc_url;
      if (invoiceLink) {
        await supabase.from("orders").update({ invoice_url: invoiceLink }).eq("id", orderId);
      }
      await logEvent(supabase, orderId, "ezcount_invoice", true, ezData.short_code || ezData.doc_url);
    } else {
      await logEvent(supabase, orderId, "ezcount_invoice", false, JSON.stringify(ezData));
    }
  } catch (ezErr) {
    await logEvent(supabase, orderId, "ezcount_invoice", false, String(ezErr));
  }

  try {
    const smsRes = await fetch(`${supabaseUrl}/functions/v1/order-sms-trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ order_id: orderId, trigger_type: "order_completed" }),
    });
    await logEvent(supabase, orderId, "order_sms", smsRes.ok, smsRes.ok ? "sent" : `status=${smsRes.status}`);
  } catch (smsErr) {
    await logEvent(supabase, orderId, "order_sms", false, String(smsErr));
  }

  try {
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/order-email-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    await logEvent(supabase, orderId, "order_email", emailRes.ok, emailRes.ok ? "sent" : `status=${emailRes.status}`);
  } catch (emailErr) {
    await logEvent(supabase, orderId, "order_email", false, String(emailErr));
  }

  if (orderSource === "website") {
    try {
      await supabase.from("orders").update({ woo_sync_status: "syncing", woo_sync_error: null }).eq("id", orderId);
      const { data: wooData, error: wooErr } = await supabase.functions.invoke("woo-sync", {
        body: { action: "update_order_status", order_id: orderId },
      });
      if (wooErr || wooData?.error) {
        throw new Error(wooErr?.message || wooData?.error);
      }
      await supabase.from("orders").update({ woo_sync_status: "synced", woo_sync_error: null }).eq("id", orderId);
      await logEvent(supabase, orderId, "woo_sync", true, "synced");
    } catch (wooErr) {
      const msg = wooErr instanceof Error ? wooErr.message : String(wooErr);
      await supabase.from("orders").update({ woo_sync_status: "failed", woo_sync_error: msg }).eq("id", orderId);
      await logEvent(supabase, orderId, "woo_sync", false, msg);
    }
  }

  return { verified: true, CCode: "0" };
}

export function buildSupabase(): { supabase: SupabaseClient; supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  return { supabase, supabaseUrl, supabaseKey };
}

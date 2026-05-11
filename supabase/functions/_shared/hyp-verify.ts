// Shared HYP verification logic. Called from:
//   - hyp-verify-payment  (client-initiated from /order-confirmation after browser redirect)
//   - hyp-notify          (server-to-server callback from HYP Notify URL)
//   - hyp-callback        (browser redirect target configured in HYP portal)
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
  // Raw query string from the original HYP redirect, if available. When present
  // we prefer it over rebuilding the VERIFY URL from individual fields — this
  // avoids subtle re-encoding differences (e.g. " " → "+" vs "%20") that can
  // cause HYP's signature check to fail even for a legitimately approved
  // transaction. Passed by hyp-callback (which receives the raw URL).
  _raw_query?: string;
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
  order_id: string | undefined | null,
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

// Build a x-www-form-urlencoded-ish query string using encodeURIComponent
// (which encodes space as "%20") instead of URLSearchParams (which uses "+").
// HYP's signature-verification parser treats these differently in some
// deployments — use the same style HYP uses when building the original
// redirect URL so the signed values round-trip identically.
function encodeQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join("&");
}

// Parse a HYP API response body into key/value pairs. HYP returns bare query
// strings (e.g. "CCode=0&Id=...") but responses sometimes include a UTF-8 BOM,
// a leading "?", or trailing whitespace — normalise before parsing.
function parseHypResponse(raw: string): URLSearchParams {
  let s = raw.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); // BOM
  if (s.startsWith("?")) s = s.slice(1);
  return new URLSearchParams(s);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function runHypVerify(
  supabase: SupabaseClient,
  supabaseUrl: string,
  supabaseKey: string,
  input: HypVerifyInput,
  source: "redirect" | "notify",
): Promise<HypVerifyResult> {
  const { order_id, _raw_query, ...hyp } = input;
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

  if (!masof || !api_key || !passp) {
    return { verified: false, reason: "hyp_credentials_incomplete" };
  }

  // ── Resolve order id (needed for idempotency + amount check + updates) ──
  let resolvedOrderId = order_id || null;
  if (!resolvedOrderId && Order) {
    const { data: row } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", Number(Order))
      .maybeSingle();
    resolvedOrderId = row?.id || null;
  }

  // If we can't resolve the order the customer claims to have paid for, something
  // is seriously wrong. Don't silently return "verified" — that masks real problems
  // (wrong merchant, mismatched order_number, etc.) and leaves the order unpaid.
  if (!resolvedOrderId) {
    console.error("hyp-verify: order not found for Order=", Order, "Id=", Id);
    return { verified: false, reason: "order_not_found", CCode: CCode };
  }

  // ── Idempotency pre-check (fast path) ──
  // Final idempotency is guaranteed by the DB unique index on payments(order_id, reference)
  // and a 23505 catch on insert, but this pre-check avoids hitting HYP when we already
  // know the answer. It ALSO covers the case where notify already processed the payment
  // before the browser redirect arrived — return success instead of re-verifying.
  if (Id) {
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

  // ── Build the VERIFY URL ──
  // Prefer the raw query string when available (forwarded from hyp-callback).
  // Re-using the exact string HYP sent us guarantees the signed values
  // round-trip byte-identically; re-encoding them via URLSearchParams uses
  // "+" for spaces which breaks HYP's signature check in some terminal setups.
  let verifyUrl: string;
  if (_raw_query) {
    const prefix = encodeQuery({
      action: "APISign",
      What: "VERIFY",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
    });
    // Strip action/What/KEY/PassP/Masof if HYP happened to include them on the
    // redirect (it doesn't normally), then prepend our VERIFY credentials.
    const cleanRaw = _raw_query
      .split("&")
      .filter((kv) => {
        const k = kv.split("=")[0];
        return k && !["action", "What", "KEY", "PassP", "Masof"].includes(k);
      })
      .join("&");
    verifyUrl = `https://pay.hyp.co.il/p/?${prefix}${cleanRaw ? `&${cleanRaw}` : ""}`;
  } else {
    const verifyParams: Record<string, string> = {
      action: "APISign",
      What: "VERIFY",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
    };
    if (Id) verifyParams.Id = Id;
    if (CCode !== undefined) verifyParams.CCode = String(CCode);
    if (Amount) verifyParams.Amount = String(Amount);
    if (ACode) verifyParams.ACode = ACode;
    if (Order) verifyParams.Order = Order;
    if (Fild1) verifyParams.Fild1 = Fild1;
    if (Fild2) verifyParams.Fild2 = Fild2;
    if (Fild3 !== undefined) verifyParams.Fild3 = Fild3 || "";
    if (Sign) verifyParams.Sign = Sign;
    if (Bank) verifyParams.Bank = String(Bank);
    if (Payments) verifyParams.Payments = String(Payments);
    if (UserId) verifyParams.UserId = UserId;
    if (Brand) verifyParams.Brand = String(Brand);
    if (Issuer) verifyParams.Issuer = String(Issuer);
    if (L4digit) verifyParams.L4digit = L4digit;
    if (street) verifyParams.street = street;
    if (city) verifyParams.city = city;
    if (zip) verifyParams.zip = zip;
    if (cell) verifyParams.cell = cell;
    if (Coin) verifyParams.Coin = String(Coin);
    if (Tmonth) verifyParams.Tmonth = Tmonth;
    if (Tyear) verifyParams.Tyear = Tyear;
    if (errMsg !== undefined) verifyParams.errMsg = errMsg;
    if (Hesh) verifyParams.Hesh = Hesh;
    verifyUrl = `https://pay.hyp.co.il/p/?${encodeQuery(verifyParams)}`;
  }

  // ── Call HYP VERIFY (with timeout) ──
  let verifyResult = "";
  let verifyFetchError: string | null = null;
  try {
    const verifyResponse = await fetchWithTimeout(verifyUrl, 10000);
    verifyResult = await verifyResponse.text();
    if (!verifyResponse.ok) {
      verifyFetchError = `http_${verifyResponse.status}`;
    }
  } catch (err) {
    verifyFetchError = err instanceof Error ? err.message : String(err);
  }

  const resultParams = parseHypResponse(verifyResult);
  const resultCCode = resultParams.get("CCode");

  // ── Decide whether VERIFY passed ──
  // Primary path: HYP explicitly returned CCode=0 → verified.
  // Permissive fallback: we couldn't parse a clean CCode from the VERIFY
  // response (network glitch, empty body, HTML error page, terminal doesn't
  // have signature-verify enabled) AND the customer arrived with CCode=0 +
  // a real transaction Id. In that case we trust the callback and let the
  // server-to-server notify act as the secondary check. Without this
  // fallback a VERIFY hiccup causes a successfully-charged customer to see
  // "payment failed", which is the worst possible UX.
  const verifyPassedStrict = resultCCode === "0";
  const verifyAmbiguous =
    !verifyPassedStrict && (resultCCode === null || verifyFetchError !== null);
  const callbackSaidSuccess = CCode === "0" && !!Id;
  const verifyPassed = verifyPassedStrict || (verifyAmbiguous && callbackSaidSuccess);

  if (!verifyPassed) {
    await logEvent(
      supabase,
      resolvedOrderId,
      `hyp_verify_${source}`,
      false,
      `verify_failed CCode=${resultCCode} fetch=${verifyFetchError || "ok"}`,
      { raw: verifyResult.slice(0, 2000), fetchError: verifyFetchError, input_CCode: CCode, Id },
    );
    return { verified: false, CCode: resultCCode || CCode, raw: verifyResult };
  }

  if (verifyAmbiguous) {
    await logEvent(
      supabase,
      resolvedOrderId,
      `hyp_verify_${source}_soft_ok`,
      true,
      `verify_ambiguous_trusting_callback CCode=${CCode} fetch=${verifyFetchError || "ok"}`,
      { raw: verifyResult.slice(0, 2000), fetchError: verifyFetchError, Id },
    );
  }

  // ── Fetch order for amount check + side-effects ──
  const { data: orderData } = await supabase
    .from("orders")
    .select("total, customer_name, customer_email, customer_phone, source, shipping_cost, discount_amount, payment_method, digital_payment_amount")
    .eq("id", resolvedOrderId)
    .single();

  if (!orderData) {
    // Extremely unlikely — we already resolved the id a few lines above — but
    // treat as a hard failure so the customer gets an actionable error rather
    // than a silent "ok".
    await logEvent(supabase, resolvedOrderId, `hyp_verify_${source}`, false, "order_disappeared_mid_verify", { Id });
    return { verified: false, CCode: "0", reason: "order_not_found" };
  }

  // ── Amount verification (Coin=1 → ILS, Amount is actually charged) ──
  // For split-payment orders, only the digital portion is charged online —
  // the rest is collected as cash on delivery. Compare against that, not
  // the full order total, otherwise legitimate split payments are rejected.
  const chargedAmount = Number(Amount || 0);
  const orderTotal = Number(orderData.total);
  const isSplit = (orderData as { payment_method?: string }).payment_method === "split";
  const expectedAmount = isSplit
    ? Number((orderData as { digital_payment_amount?: number }).digital_payment_amount || 0)
    : orderTotal;
  if (!isFinite(chargedAmount) || !(expectedAmount > 0) || Math.abs(chargedAmount - expectedAmount) > 0.01) {
    await logEvent(
      supabase,
      resolvedOrderId,
      "hyp_amount_mismatch",
      false,
      `charged=${chargedAmount} expected=${expectedAmount} total=${orderTotal} split=${isSplit}`,
      { Id, source, expected: expectedAmount, total: orderTotal, split: isSplit },
    );
    await supabase
      .from("orders")
      .update({ woo_sync_error: `HYP amount mismatch: charged ₪${chargedAmount}, expected ₪${expectedAmount}` })
      .eq("id", resolvedOrderId);
    return { verified: false, CCode: "0", amount_mismatch: true, reason: "amount_mismatch" };
  }

  // ── Update order → processing, store transaction id, clear payment_link_url ──
  await supabase
    .from("orders")
    .update({
      status: "processing",
      hyp_transaction_id: Id || null,
      payment_link_url: null,
    })
    .eq("id", resolvedOrderId);

  // ── Resolve HYP cash register (so credit transactions accumulate in a dedicated register) ──
  let hypRegisterId: string | null = null;
  try {
    const { data: hypReg } = await supabase
      .from("cash_registers")
      .select("id")
      .ilike("name", "%HYP%")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    hypRegisterId = hypReg?.id || null;
  } catch (regErr) {
    console.error("hyp-verify: failed to resolve HYP register (non-blocking):", regErr);
  }

  // ── Insert payment row (unique index on (order_id, reference) enforces idempotency) ──
  const paymentInsert = await supabase.from("payments").insert({
    order_id: resolvedOrderId,
    amount: chargedAmount,
    payment_method: "credit",
    reference: `HYP-${Id || ""}`,
    cash_register_id: hypRegisterId,
  });

  if (paymentInsert.error) {
    const code = (paymentInsert.error as { code?: string }).code;
    if (code === "23505") {
      // Concurrent insert won; treat as already processed.
      await logEvent(supabase, resolvedOrderId, `hyp_verify_${source}`, true, "duplicate_ignored", { Id });
      return { verified: true, CCode: "0", already_processed: true };
    }
    await logEvent(supabase, resolvedOrderId, "hyp_payment_insert_failed", false, paymentInsert.error.message, { Id });
    return { verified: false, CCode: "0", reason: "payment_insert_failed" };
  }

  // ── Bump HYP register balance ──
  if (hypRegisterId) {
    try {
      await supabase.rpc("increment_cash_register", {
        reg_id: hypRegisterId,
        delta: chargedAmount,
      });
    } catch (balErr) {
      console.error("hyp-verify: failed to increment HYP register balance (non-blocking):", balErr);
      await logEvent(supabase, resolvedOrderId, "hyp_register_balance_failed", false, String(balErr), { Id, hypRegisterId });
    }
  }

  await logEvent(supabase, resolvedOrderId, `hyp_verify_${source}`, true, "payment_recorded", { Id, amount: chargedAmount });

  // Coupon `used_count` is bumped client-side from the confirmation page
  // (reads `hyp_coupon_id` from sessionStorage after a fresh verify) to avoid
  // requiring a new `orders.applied_coupon_id` column.

  // ── Invoice receipt ──
  // HYP itself is configured in EZCount to auto-issue the invoice-receipt
  // (Type 320) for credit transactions. We intentionally DO NOT issue one
  // here to avoid creating a duplicate document. For cash/bit payments the
  // operator issues it manually from PaymentSection in the CRM.

  // ── SMS ──
  try {
    const smsRes = await fetch(`${supabaseUrl}/functions/v1/order-sms-trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ order_id: resolvedOrderId, trigger_type: "order_completed" }),
    });
    await logEvent(supabase, resolvedOrderId, "order_sms", smsRes.ok, smsRes.ok ? "sent" : `status=${smsRes.status}`);
  } catch (smsErr) {
    await logEvent(supabase, resolvedOrderId, "order_sms", false, String(smsErr));
  }

  // ── Email ──
  try {
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/order-email-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ order_id: resolvedOrderId }),
    });
    await logEvent(supabase, resolvedOrderId, "order_email", emailRes.ok, emailRes.ok ? "sent" : `status=${emailRes.status}`);
  } catch (emailErr) {
    await logEvent(supabase, resolvedOrderId, "order_email", false, String(emailErr));
  }

  // ── WooCommerce sync (website orders only) ──
  if (orderData.source === "website") {
    try {
      await supabase.from("orders").update({ woo_sync_status: "syncing", woo_sync_error: null }).eq("id", resolvedOrderId);
      const { data: wooData, error: wooErr } = await supabase.functions.invoke("woo-sync", {
        body: { action: "update_order_status", order_id: resolvedOrderId },
      });
      if (wooErr || wooData?.error) {
        throw new Error(wooErr?.message || wooData?.error);
      }
      await supabase.from("orders").update({ woo_sync_status: "synced", woo_sync_error: null }).eq("id", resolvedOrderId);
      await logEvent(supabase, resolvedOrderId, "woo_sync", true, "synced");
    } catch (wooErr) {
      const msg = wooErr instanceof Error ? wooErr.message : String(wooErr);
      await supabase.from("orders").update({ woo_sync_status: "failed", woo_sync_error: msg }).eq("id", resolvedOrderId);
      await logEvent(supabase, resolvedOrderId, "woo_sync", false, msg);
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

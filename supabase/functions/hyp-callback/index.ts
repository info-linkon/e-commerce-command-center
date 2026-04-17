// HYP redirect target. Configured in the HYP merchant portal as both the
// success and failure URL:
//   https://<supabase-project>.supabase.co/functions/v1/hyp-callback
//
// Flow:
//   1. Customer completes payment on HYP. HYP redirects the browser here with
//      all transaction params in the query string (Id, CCode, Amount, Sign, ...).
//   2. We run the same verify logic used by hyp-verify-payment/hyp-notify —
//      server-side, before the customer sees any UI. This means the order
//      is updated even if the customer's browser is slow, has JS disabled,
//      or navigates away immediately after.
//   3. 302 redirect the customer to the SPA confirmation page with a
//      ?status=... query param that the React view reads for rendering.
//
// Blueprint ref: docs/hypay.apib §"Step 3 - Success Page Redirect" — HYP
// appends all transaction params (same fields for success and failure, the
// only difference is CCode).

import { buildSupabase, runHypVerify, HypVerifyInput } from "../_shared/hyp-verify.ts";

function paramsToInput(sp: URLSearchParams, rawQuery: string): HypVerifyInput {
  const get = (k: string) => sp.get(k) ?? undefined;
  return {
    Id: get("Id"),
    CCode: get("CCode"),
    Amount: get("Amount"),
    ACode: get("ACode"),
    Order: get("Order"),
    Fild1: get("Fild1"),
    Fild2: get("Fild2"),
    Fild3: get("Fild3"),
    Sign: get("Sign"),
    Bank: get("Bank"),
    Payments: get("Payments"),
    UserId: get("UserId"),
    Brand: get("Brand"),
    Issuer: get("Issuer"),
    L4digit: get("L4digit"),
    street: get("street"),
    city: get("city"),
    zip: get("zip"),
    cell: get("cell"),
    Coin: get("Coin"),
    Tmonth: get("Tmonth"),
    Tyear: get("Tyear"),
    errMsg: get("errMsg"),
    Hesh: get("Hesh"),
    _raw_query: rawQuery || undefined,
  };
}

async function resolveSiteUrl(): Promise<string> {
  try {
    const { supabase } = buildSupabase();
    const { data } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "general")
      .maybeSingle();
    const config = (data?.content as Record<string, string> | null) || {};
    return (
      config.site_url ||
      Deno.env.get("SITE_URL") ||
      "https://elwejha.co.il"
    );
  } catch {
    return "https://elwejha.co.il";
  }
}

function redirectTo(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // URL.search keeps "?" prefix; strip it before forwarding so hyp-verify can
  // treat it as a clean "a=1&b=2" string.
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const input = paramsToInput(url.searchParams, rawQuery);
  const siteUrl = (await resolveSiteUrl()).replace(/\/$/, "");

  // Build a friendly confirmation URL. Always include the HYP Order param
  // (= our order_number) in the path so the confirmation page can render
  // order details even before the DB update is visible.
  const orderPart = input.Order ? `/${encodeURIComponent(input.Order)}` : "";
  const confirmBase = `${siteUrl}/order-confirmation${orderPart}`;

  console.log("hyp-callback received:", JSON.stringify({
    method: req.method,
    CCode: input.CCode,
    Id: input.Id,
    Amount: input.Amount,
    Order: input.Order,
    errMsg: input.errMsg,
  }));

  try {
    // CCode !== "0" means payment failed / postponed / cancelled.
    // No need to call HYP VERIFY — just inform the customer.
    if (input.CCode !== "0") {
      console.log("hyp-callback non-success CCode:", input.CCode);
      // Best-effort log so we can debug declined payments from the CRM.
      try {
        const { supabase } = buildSupabase();
        if (input.Order) {
          const { data: row } = await supabase
            .from("orders")
            .select("id")
            .eq("order_number", Number(input.Order))
            .maybeSingle();
          if (row?.id) {
            await supabase.from("payment_events").insert({
              order_id: row.id,
              event_type: "hyp_callback_declined",
              success: false,
              message: `CCode=${input.CCode} errMsg=${input.errMsg || ""}`,
              metadata: { Id: input.Id, Amount: input.Amount, CCode: input.CCode },
            });
          }
        }
      } catch (logErr) {
        console.error("hyp-callback log failed (non-blocking):", logErr);
      }
      return redirectTo(`${confirmBase}?status=failed&CCode=${input.CCode || "unknown"}`);
    }

    const { supabase, supabaseUrl, supabaseKey } = buildSupabase();
    const result = await runHypVerify(supabase, supabaseUrl, supabaseKey, input, "redirect");
    console.log("hyp-callback verify result:", JSON.stringify({
      verified: result.verified,
      already_processed: result.already_processed,
      amount_mismatch: result.amount_mismatch,
      reason: result.reason,
      CCode: result.CCode,
    }));

    if (result.amount_mismatch) {
      return redirectTo(`${confirmBase}?status=amount_mismatch`);
    }

    if (result.verified) {
      const flag = result.already_processed ? "already" : "ok";
      // Forward Amount so the confirmation page can fire the Meta Pixel Purchase
      // event with the correct value.
      const amountParam = input.Amount ? `&Amount=${encodeURIComponent(input.Amount)}` : "";
      return redirectTo(`${confirmBase}?status=${flag}${amountParam}`);
    }

    return redirectTo(`${confirmBase}?status=failed&CCode=${result.CCode || "0"}&reason=${encodeURIComponent(result.reason || "verify_failed")}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("hyp-callback error:", msg);
    // Still show the customer SOMETHING — send them to the confirmation page
    // with an error state so they can contact support.
    return redirectTo(`${confirmBase}?status=error`);
  }
});

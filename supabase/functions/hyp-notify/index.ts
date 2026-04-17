// HYP server-to-server Notify URL endpoint. Configured in the HYP merchant portal
// (or passed as `NotifyUrl` in SIGN params if the account supports it) so that
// payments complete even when the customer closes the browser before the
// redirect to /order-confirmation.
//
// Accepts GET (query string) or POST (form-urlencoded or JSON).
// Always responds 200 so HYP doesn't retry indefinitely — failures are captured
// in the `payment_events` table for ops review.

import { buildSupabase, runHypVerify, HypVerifyInput } from "../_shared/hyp-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function paramsToInput(sp: URLSearchParams): HypVerifyInput {
  const get = (k: string) => sp.get(k) ?? undefined;
  return {
    order_id: get("order_id"),
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
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let input: HypVerifyInput;

    if (req.method === "GET") {
      const url = new URL(req.url);
      input = paramsToInput(url.searchParams);
    } else {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await req.json();
        input = body as HypVerifyInput;
      } else {
        // form-urlencoded
        const text = await req.text();
        input = paramsToInput(new URLSearchParams(text));
      }
    }

    console.log("hyp-notify received:", JSON.stringify(input));

    if (!input.Id && !input.Order) {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const { supabase, supabaseUrl, supabaseKey } = buildSupabase();
    const result = await runHypVerify(supabase, supabaseUrl, supabaseKey, input, "notify");

    console.log("hyp-notify result:", JSON.stringify(result));

    // Always 200 so HYP doesn't retry
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("hyp-notify error:", msg);
    // Still return 200 to avoid retry storms; error is logged
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

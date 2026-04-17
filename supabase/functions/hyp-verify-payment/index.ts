// Client-initiated HYP verification. Called from /order-confirmation after the
// customer returns from the HYP hosted payment page. Delegates to the shared
// verify logic used by both this function and `hyp-notify` (server-to-server).
//
// Blueprint refs: docs/hypay.apib §"Step 2 - APISign Verify"

import { buildSupabase, runHypVerify, HypVerifyInput } from "../_shared/hyp-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as HypVerifyInput;
    const { supabase, supabaseUrl, supabaseKey } = buildSupabase();
    const result = await runHypVerify(supabase, supabaseUrl, supabaseKey, body, "redirect");

    // If HYP VERIFY responded non-zero, surface the raw response for debugging
    const status = 200;
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("hyp-verify-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
    const { data: configRow, error: configError } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "hyp")
      .maybeSingle();

    if (configError || !configRow?.content) {
      return new Response(JSON.stringify({ error: "HYP credentials not configured. Go to Settings → Payment." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configRow.content as Record<string, string>;
    const { masof, api_key, passp } = config;

    if (!masof || !api_key || !passp) {
      return new Response(JSON.stringify({ error: "HYP credentials incomplete (masof, api_key, passp required)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, order_number, total, customer_name, customer_phone, customer_email, success_url, error_url, info } = await req.json();

    if (!order_id || !total || !success_url || !error_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: order_id, total, success_url, error_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: APISign — get signature
    const signParams = new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
      Amount: String(total),
      Order: String(order_number || order_id),
      Info: info || `Order ${order_number || order_id}`,
      ClientName: customer_name || "",
      phone: customer_phone || "",
      email: customer_email || "",
      UTF8: "True",
      UTF8out: "True",
      Sign: "True",
      MoreData: "True",
      Coin: "1",
      PageLang: "HEB",
      tmp: "1",
      sendemail: customer_email ? "True" : "False",
      FixTash: "False",
      J5: "False",
      Postpone: "False",
    });

    const signUrl = `https://pay.hyp.co.il/p/?${signParams.toString()}`;
    console.log("HYP APISign request URL:", signUrl);

    const signResponse = await fetch(signUrl);
    const signResult = await signResponse.text();
    console.log("HYP APISign response:", signResult);

    // The response is URL-encoded params including signature
    // Build payment URL from the response
    if (signResult.includes("signature=")) {
      // The response IS the query string for the payment page
      const paymentUrl = `https://pay.hyp.co.il/p/?${signResult}`;

      // Update success/error URLs — HYP redirects to the URLs configured in the portal,
      // but we pass Order param so we can identify the order on return
      return new Response(JSON.stringify({
        success: true,
        payment_url: paymentUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Error — no signature returned
    return new Response(JSON.stringify({
      error: "Failed to get payment signature from HYP",
      raw: signResult,
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("HYP create payment error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Create a HYP payment page URL for an order (used by the website iframe checkout).
// Saves the generated URL on the order so it can be re-served to the customer
// if the browser closes mid-payment, and configures NotifyUrl for
// server-to-server reconciliation.
//
// Blueprint refs:
//   - docs/hypay.apib §"Step 1 - APISign"
//   - docs/hypay.apib §"Set Up Success and Failure Pages" — response URLs
//     are configured in the HYP portal, not via request params.

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

    const { order_id, order_number, total, customer_name, customer_phone, customer_email, info } = await req.json();

    if (!order_id || !total) {
      return new Response(JSON.stringify({ error: "Missing required fields: order_id, total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard against re-issuing a link for an already-paid order
    const { data: existing } = await supabase
      .from("orders")
      .select("hyp_transaction_id, status")
      .eq("id", order_id)
      .maybeSingle();
    const blockedStatuses = new Set(["processing", "picking", "shipping", "completed", "cancelled"]);
    if (existing?.hyp_transaction_id || blockedStatuses.has(existing?.status || "")) {
      return new Response(
        JSON.stringify({ error: "ההזמנה כבר שולמה או סגורה", already_paid: !!existing?.hyp_transaction_id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const notifyUrl = `${supabaseUrl}/functions/v1/hyp-notify`;

    // APISign — get signature. Response URLs are portal-configured (blueprint),
    // so we don't pass success/error redirect params here.
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
      tmp: "7",
      sendemail: customer_email ? "True" : "False",
      FixTash: "False",
      J5: "False",
      Postpone: "False",
      pageTimeOut: "True",
      NotifyUrl: notifyUrl,
    });

    const signUrl = `https://pay.hyp.co.il/p/?${signParams.toString()}`;
    console.log("HYP APISign request URL:", signUrl);

    const signResponse = await fetch(signUrl);
    const signResult = await signResponse.text();
    console.log("HYP APISign response:", signResult);

    if (signResult.includes("signature=")) {
      const paymentUrl = `https://pay.hyp.co.il/p/?${signResult}`;

      // Persist the signed URL so it can be re-served via /pay/:orderNumber
      // if the customer closes the iframe before completing the payment.
      await supabase
        .from("orders")
        .update({ payment_link_url: paymentUrl } as any)
        .eq("id", order_id);

      return new Response(JSON.stringify({
        success: true,
        payment_url: paymentUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

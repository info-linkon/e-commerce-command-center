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

// Match HYP's own query-string encoding style ("%20" for spaces, not "+") —
// URLSearchParams.toString() uses application/x-www-form-urlencoded which
// breaks signature verification on some HYP terminals.
function encodeQuery(params: Record<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  return parts.join("&");
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

    // Amount must be a valid positive number — pass through with 2dp to match
    // what HYP will echo back on the callback (avoids false amount-mismatches).
    const numericTotal = Number(total);
    if (!isFinite(numericTotal) || numericTotal <= 0) {
      return new Response(JSON.stringify({ error: `Invalid total: ${total}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amountStr = numericTotal.toFixed(2);

    // APISign — get signature. Response URLs are portal-configured (blueprint),
    // so we don't pass success/error redirect params here.
    const signParams: Record<string, string> = {
      action: "APISign",
      What: "SIGN",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
      Amount: amountStr,
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
    };

    const signUrl = `https://pay.hyp.co.il/p/?${encodeQuery(signParams)}`;
    console.log("HYP APISign request (order_id=" + order_id + " order_number=" + order_number + ")");

    // Helper: tag the order with a failure reason so ops can see why the
    // checkout got stuck in pending_payment instead of just looking abandoned.
    // We do this server-side because the storefront (anon) has no UPDATE on
    // orders. Best-effort — never let the bookkeeping mask the real error.
    async function tagOrderFailure(reason: string): Promise<void> {
      try {
        const { data: row } = await supabase
          .from("orders")
          .select("notes")
          .eq("id", order_id)
          .maybeSingle();
        const prev = (row?.notes || "").trim();
        const stamp = `⚠️ יצירת לינק תשלום נכשלה: ${reason}`;
        await supabase
          .from("orders")
          .update({ notes: prev ? `${prev} | ${stamp}` : stamp })
          .eq("id", order_id);
      } catch (tagErr) {
        console.warn("failed to tag order with payment failure reason:", tagErr);
      }
    }

    let signResult = "";
    try {
      const signResponse = await fetchWithTimeout(signUrl, 15000);
      signResult = (await signResponse.text()).trim();
      if (signResult.charCodeAt(0) === 0xfeff) signResult = signResult.slice(1); // strip BOM
      if (signResult.startsWith("?")) signResult = signResult.slice(1);
      if (!signResponse.ok) {
        console.error("HYP APISign returned HTTP", signResponse.status, "body:", signResult.slice(0, 500));
        await tagOrderFailure(`HYP HTTP ${signResponse.status}`);
        return new Response(
          JSON.stringify({ error: `HYP returned HTTP ${signResponse.status}`, raw: signResult.slice(0, 500) }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("HYP APISign fetch failed:", msg);
      await tagOrderFailure(`fetch failed: ${msg}`);
      return new Response(
        JSON.stringify({ error: `Failed to reach HYP: ${msg}` }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("HYP APISign response:", signResult.slice(0, 500));

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

    // HYP returned a body without `signature=` — usually means bad credentials
    // or a malformed request. Surface the raw response so it's debuggable.
    await tagOrderFailure(`bad sign response: ${signResult.slice(0, 200)}`);
    return new Response(JSON.stringify({
      error: "Failed to get payment signature from HYP",
      raw: signResult.slice(0, 500),
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

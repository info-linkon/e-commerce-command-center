const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HYP_ENDPOINT = "https://pay.hyp.co.il/p/";

function splitName(fullName: string): { first: string; last: string } {
  const clean = (fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { first: "", last: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function cleanPhone(raw?: string): string {
  return (raw || "").replace(/[^\d]/g, "").slice(0, 15);
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function signWithRetry(url: string): Promise<{ ok: boolean; body: string; status: number }> {
  const delays = [0, 800, 2000];
  let lastStatus = 0;
  let lastBody = "";
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const res = await fetchWithTimeout(url, 15000);
      const body = await res.text();
      lastStatus = res.status;
      lastBody = body;
      if (res.ok && body.includes("signature=")) {
        return { ok: true, body, status: res.status };
      }
    } catch (err) {
      lastBody = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, body: lastBody, status: lastStatus };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const body = await req.json();
    const { order_id, order_number, total, customer_name, customer_phone, customer_email, info } = body;

    if (!order_id || total === undefined || total === null) {
      return new Response(JSON.stringify({ error: "Missing required fields: order_id, total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numericAmount = Number(total);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountStr = numericAmount.toFixed(2);
    const { first, last } = splitName(customer_name || "");
    const phone = cleanPhone(customer_phone);

    // HYP requires non-empty ClientName; fall back to a placeholder to avoid CCode=401
    const clientName = first || "לקוח";
    // UserId is required; 000000000 is Hypay's accepted "no-ID" fallback
    const userId = "000000000";

    const signParams = new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
      Amount: amountStr,
      Order: String(order_number || order_id),
      Info: (info || `Order ${order_number || order_id}`).slice(0, 100),
      ClientName: clientName,
      UserId: userId,
      UTF8: "True",
      UTF8out: "True",
      Sign: "True",
      MoreData: "True",
      Coin: "1",
      PageLang: "HEB",
      tmp: "7",
      pageTimeOut: "True",
      sendemail: customer_email ? "True" : "False",
      FixTash: "False",
      J5: "False",
      Postpone: "False",
    });

    if (last) signParams.set("ClientLName", last);
    if (phone) {
      signParams.set("phone", phone);
      signParams.set("cell", phone);
    }
    if (customer_email) signParams.set("email", customer_email);

    const signUrl = `${HYP_ENDPOINT}?${signParams.toString()}`;
    console.log("HYP APISign request (order", order_id, "amount", amountStr, ")");

    const signed = await signWithRetry(signUrl);

    if (!signed.ok) {
      console.error("HYP APISign failed after retries:", signed.status, signed.body);
      return new Response(JSON.stringify({
        error: "Failed to get payment signature from HYP",
        raw: signed.body?.slice(0, 500),
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Response body IS the query string for the payment page (includes signature)
    const paymentUrl = `${HYP_ENDPOINT}?${signed.body}`;

    // Persist the payment URL so the order can be re-paid via a link if needed
    try {
      await supabase
        .from("orders")
        .update({ payment_link_url: paymentUrl } as any)
        .eq("id", order_id);
    } catch (persistErr) {
      console.warn("Could not persist payment_link_url (non-blocking):", persistErr);
    }

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
    }), {
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

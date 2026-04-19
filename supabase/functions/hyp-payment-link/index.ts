// Generate a HYP payment page URL for an existing order, save a short
// /pay/:orderNumber link on the order, and SMS it to the customer.
//
// Guards:
//   - Refuses to generate a link for orders that are already paid or completed.
//   - `NotifyUrl` is passed so HYP can server-to-server notify us even if the
//     customer closes the browser mid-payment (see hyp-notify function).
//
// Blueprint refs: docs/hypay.apib §"Step 1 - APISign"

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
      return new Response(JSON.stringify({ error: "הגדרות HYP לא מוגדרות. עבור להגדרות → תשלום." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = configRow.content as Record<string, string>;
    const { masof, api_key, passp } = config;

    if (!masof || !api_key || !passp) {
      return new Response(JSON.stringify({ error: "הגדרות HYP חסרות (masof, api_key, passp)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read site URL from general settings (fallback to env, then hardcoded)
    const { data: generalRow } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "general")
      .maybeSingle();
    const generalConfig = (generalRow?.content as Record<string, string> | null) || {};
    const siteUrl =
      generalConfig.site_url ||
      Deno.env.get("SITE_URL") ||
      "https://elwejha.co.il";

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order details + paid-status guard
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total, customer_name, customer_phone, customer_email, status, hyp_transaction_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "הזמנה לא נמצאה" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Guard: refuse to generate a link only when there's actual payment proof or the
    // order is fully closed. Picking/shipping/processing are operational stages and do
    // NOT indicate payment — orders in those stages may still need a payment link.
    const blockedStatuses = new Set(["completed", "cancelled"]);
    if (order.hyp_transaction_id || blockedStatuses.has(order.status || "")) {
      return new Response(
        JSON.stringify({
          error: "לא ניתן ליצור לינק תשלום — ההזמנה כבר שולמה או סגורה",
          already_paid: !!order.hyp_transaction_id,
          status: order.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!order.customer_phone) {
      return new Response(JSON.stringify({ error: "ללקוח אין מספר טלפון" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Generate HYP payment URL via APISign.
    // NOTE (blueprint §"Set Up Success and Failure Pages"): SuccessRedirectUrl /
    // ErrorRedirectUrl are NOT documented params — response pages are configured
    // in the HYP merchant portal. Passing them here is a no-op, so we omit them.
    const notifyUrl = `${supabaseUrl}/functions/v1/hyp-notify`;

    const signParams = new URLSearchParams({
      action: "APISign",
      What: "SIGN",
      Masof: masof,
      KEY: api_key,
      PassP: passp,
      Amount: String(order.total),
      Order: String(order.order_number),
      Info: `הזמנה #${order.order_number}`,
      ClientName: order.customer_name || "",
      phone: order.customer_phone || "",
      email: order.customer_email || "",
      UTF8: "True",
      UTF8out: "True",
      Sign: "True",
      MoreData: "True",
      Coin: "1",
      PageLang: "HEB",
      tmp: "1",
      sendemail: order.customer_email ? "True" : "False",
      FixTash: "False",
      J5: "False",
      Postpone: "False",
      pageTimeOut: "True",
      // NotifyUrl — per-account HYP feature; safe to send even if terminal ignores it.
      NotifyUrl: notifyUrl,
    });

    const signUrl = `https://pay.hyp.co.il/p/?${signParams.toString()}`;
    console.log("HYP APISign request URL:", signUrl);

    const signResponse = await fetch(signUrl);
    const signResult = await signResponse.text();
    console.log("HYP APISign response:", signResult);

    if (!signResult.includes("signature=")) {
      return new Response(JSON.stringify({
        error: "שגיאה בקבלת חתימה מ-HYP",
        raw: signResult,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPaymentUrl = `https://pay.hyp.co.il/p/?${signResult}`;

    // Save payment link on order and build a short redirect URL
    await supabase
      .from("orders")
      .update({ payment_link_url: fullPaymentUrl } as any)
      .eq("id", order_id);

    // Short URL via edge function (works regardless of custom domain SPA config)
    const shortPaymentUrl = `${siteUrl.replace(/\/$/, "")}/pay/${order.order_number}`;

    // Step 2: Send SMS with SHORT payment link
    const { data: smsConfig } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "inforu")
      .maybeSingle();

    const inforuConfig = smsConfig?.content as Record<string, string> | null;
    const username = inforuConfig?.username || Deno.env.get("INFORU_USERNAME");
    const token = inforuConfig?.token || Deno.env.get("INFORU_TOKEN");
    const sender = inforuConfig?.sender || Deno.env.get("INFORU_SENDER") || "ELWEJHA";

    if (!username || !token) {
      return new Response(JSON.stringify({
        success: true,
        payment_url: shortPaymentUrl,
        sms_sent: false,
        sms_error: "הגדרות SMS לא מוגדרות",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone for Israel
    let formattedPhone = order.customer_phone.replace(/[\s\-()]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "972" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("972")) {
      formattedPhone = "972" + formattedPhone;
    }

    const smsMessage = `שלום ${order.customer_name || ""}, לתשלום הזמנה #${order.order_number} בסך ₪${order.total} לחץ כאן: ${shortPaymentUrl}`;

    console.log("Sending payment link SMS to:", formattedPhone, "URL:", shortPaymentUrl);

    const basicAuth = btoa(`${username}:${token}`);
    const smsBody = {
      Message: smsMessage,
      Recipients: [{ Phone: formattedPhone }],
      Settings: { Sender: sender },
    };

    const smsResponse = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(smsBody),
    });

    const smsResultText = await smsResponse.text();
    console.log("InforU SMS response:", smsResponse.status, smsResultText);

    let smsResult;
    try { smsResult = JSON.parse(smsResultText); } catch { smsResult = { raw: smsResultText }; }

    const smsSent = smsResponse.ok && smsResult?.StatusDescription !== "Error";

    // Log the event so ops can see failures without digging through function logs
    await supabase.from("payment_events").insert({
      order_id,
      event_type: "hyp_payment_link_sms",
      success: smsSent,
      message: smsSent ? "sent" : (smsResult?.StatusDescription || smsResult?.Message || "error"),
      metadata: { phone: formattedPhone, short_url: shortPaymentUrl },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true,
      payment_url: shortPaymentUrl,
      sms_sent: smsSent,
      sms_error: smsSent ? null : (smsResult?.StatusDescription || smsResult?.Message || "שגיאה בשליחת SMS"),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("HYP payment link error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

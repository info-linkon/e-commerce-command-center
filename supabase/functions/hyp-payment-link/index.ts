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

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total, customer_name, customer_phone, customer_email")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "הזמנה לא נמצאה" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.customer_phone) {
      return new Response(JSON.stringify({ error: "ללקוח אין מספר טלפון" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use custom domain
    const siteUrl = "https://elwejha.co.il";

    const successUrl = `${siteUrl}/order-confirmation`;
    const errorUrl = `${siteUrl}/order-confirmation`;

    // Step 1: Generate HYP payment URL via APISign
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
      SuccessRedirectUrl: successUrl,
      ErrorRedirectUrl: errorUrl,
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

    // Save payment link on order and create a short redirect URL
    await supabase
      .from("orders")
      .update({ payment_link_url: fullPaymentUrl } as any)
      .eq("id", order_id);

    // Short URL via edge function (works regardless of custom domain SPA config)
    const shortPaymentUrl = `https://elwejha.co.il/pay/${order.order_number}`;

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

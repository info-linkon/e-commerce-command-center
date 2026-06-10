import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, event_key, context } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get credentials from site_content table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "inforu")
      .maybeSingle();

    const inforuConfig = config?.content as Record<string, string> | null;

    const username = inforuConfig?.username || Deno.env.get("INFORU_USERNAME");
    const token = inforuConfig?.token || Deno.env.get("INFORU_TOKEN");
    const sender = inforuConfig?.sender || Deno.env.get("INFORU_SENDER") || "ELWEJHA";

    if (!username || !token) {
      return new Response(JSON.stringify({ error: "InforU credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone for Israel
    let formattedPhone = String(phone).replace(/[\s\-()\u200E\u200F]/g, "");
    formattedPhone = formattedPhone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "972" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("972")) {
      formattedPhone = "972" + formattedPhone;
    }

    // Guardrail: a well-formed Israeli mobile is 972 + 9 digits = 12 chars.
    // Anything shorter (e.g. "972111" from a malformed customer_phone) will
    // be rejected by LINKON as "No valid recipients" — don't waste the API
    // call and don't pretend we tried. Log to notification_log with a clear
    // error so the admin sees it in the SMS log page.
    if (!/^972\d{9}$/.test(formattedPhone)) {
      console.warn("send-sms: invalid phone, skipping", { phone, formattedPhone });
      try {
        await supabase.from("notification_log").insert({
          channel: "sms",
          event_key: event_key || "manual_sms",
          recipient: formattedPhone,
          body: message,
          status: "failed",
          error: "Invalid phone format",
          context: { ...(context || {}), sender, original_phone: phone },
        });
      } catch (logErr) {
        console.error("Failed to log invalid-phone SMS:", logErr);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Sending SMS to:", formattedPhone, "from:", sender);

    // Build Basic auth from username:token
    const basicAuth = btoa(`${username}:${token}`);

    // Use InforU REST API v2
    const restBody = {
      Message: message,
      Recipients: [{ Phone: formattedPhone }],
      Settings: {
        Sender: sender,
      },
    };

    console.log("Using REST API with Basic auth");

    const response = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(restBody),
    });

    const resultText = await response.text();
    console.log("InforU REST response:", response.status, resultText);

    let resultData;
    try {
      resultData = JSON.parse(resultText);
    } catch {
      resultData = { raw: resultText };
    }

    const isOk = response.ok && resultData?.StatusDescription !== "Error";
    const errorMsg = isOk ? null : (resultData?.StatusDescription || resultData?.Message || resultText);
    const providerMessageId = resultData?.Data?.[0]?.MessageId
      ? String(resultData.Data[0].MessageId)
      : (resultData?.MessageId ? String(resultData.MessageId) : null);

    // Log to notification_log (best-effort, never fails the response)
    try {
      await supabase.from("notification_log").insert({
        channel: "sms",
        event_key: event_key || "manual_sms",
        recipient: formattedPhone,
        body: message,
        status: isOk ? "sent" : "failed",
        error: errorMsg,
        provider_message_id: providerMessageId,
        sent_at: isOk ? new Date().toISOString() : null,
        context: { ...(context || {}), sender },
      });
    } catch (logErr) {
      console.error("Failed to log SMS:", logErr);
    }

    if (isOk) {
      return new Response(JSON.stringify({ success: true, result: resultData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("SMS send error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

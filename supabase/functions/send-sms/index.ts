const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const INFORU_USERNAME = Deno.env.get("INFORU_USERNAME");
  const INFORU_TOKEN = Deno.env.get("INFORU_TOKEN");
  const INFORU_SENDER = Deno.env.get("INFORU_SENDER");

  if (!INFORU_USERNAME || !INFORU_TOKEN) {
    return new Response(JSON.stringify({ error: "InforU credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { phone, message } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "phone and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone for Israel
    let formattedPhone = phone.replace(/[\s\-()]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "972" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("972")) {
      formattedPhone = "972" + formattedPhone;
    }

    const sender = INFORU_SENDER || "ELWEJHA";

    // Use InforU JSON API
    const jsonPayload = {
      User: {
        Username: INFORU_USERNAME,
        Token: INFORU_TOKEN,
      },
      Content: {
        Type: "sms",
        Message: message,
      },
      Recipients: [{ Phone: formattedPhone }],
      Settings: {
        Sender: sender,
      },
    };

    console.log("Sending SMS to:", formattedPhone, "sender:", sender);

    const response = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(INFORU_USERNAME + ":" + INFORU_TOKEN)}`,
      },
      body: JSON.stringify(jsonPayload),
    });

    const result = await response.text();
    console.log("InforU response status:", response.status, "body:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("SMS send error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

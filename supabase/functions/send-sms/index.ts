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

    const escapeXml = (s: string) =>
      s.replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&apos;");

    const sender = INFORU_SENDER || "ELWEJHA";

    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<Inforu>
<User>
<Username>${escapeXml(INFORU_USERNAME)}</Username>
<Token>${escapeXml(INFORU_TOKEN)}</Token>
</User>
<Content Type="sms">
<Message>${escapeXml(message)}</Message>
</Content>
<Recipients>
<PhoneNumber>${formattedPhone}</PhoneNumber>
</Recipients>
<Settings>
<Sender>${escapeXml(sender)}</Sender>
</Settings>
</Inforu>`;

    console.log("Sending SMS to:", formattedPhone);

    const response = await fetch("https://uapi.inforu.co.il/SendMessageXml.ashx", {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: xmlPayload,
    });

    const result = await response.text();
    console.log("InforU response:", result);

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

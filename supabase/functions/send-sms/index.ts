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

    console.log("Sending SMS to:", formattedPhone, "from:", sender);

    // Use InforU SOAP SendSmsDetailed endpoint
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendSmsDetailed xmlns="http://inforu.co.il/api/v2/asmx/SendMessage/">
      <userName>${escapeXml(INFORU_USERNAME)}</userName>
      <apiToken>${escapeXml(INFORU_TOKEN)}</apiToken>
      <message>${escapeXml(message)}</message>
      <phoneNumber>${formattedPhone}</phoneNumber>
      <senderName>${escapeXml(sender)}</senderName>
      <customerParameter></customerParameter>
    </SendSmsDetailed>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch("https://uapi.inforu.co.il/v2/SendMessage.asmx", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://inforu.co.il/api/v2/asmx/SendMessage/SendSmsDetailed",
      },
      body: soapBody,
    });

    const result = await response.text();
    console.log("InforU SOAP response:", result);

    // Check for success in SOAP response
    const statusMatch = result.match(/<SendSmsDetailedResult>(.*?)<\/SendSmsDetailedResult>/);
    const soapResult = statusMatch ? statusMatch[1] : result;

    return new Response(JSON.stringify({ success: true, result: soapResult }), {
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

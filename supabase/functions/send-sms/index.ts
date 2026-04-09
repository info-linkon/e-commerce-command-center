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
    const { phone, message } = await req.json();
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

    // Fallback to env secrets
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
    let formattedPhone = phone.replace(/[\s\-()]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "972" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("972")) {
      formattedPhone = "972" + formattedPhone;
    }

    console.log("Sending SMS to:", formattedPhone, "from:", sender);

    // Use InforU SOAP SendSmsDetailed endpoint
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendSmsDetailed xmlns="http://inforu.co.il/api/v2/asmx/SendMessage/">
      <userName>${escapeXml(username)}</userName>
      <apiToken>${escapeXml(token)}</apiToken>
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
    console.log("InforU response:", result);

    // Extract result from SOAP response
    const statusMatch = result.match(/<SendSmsDetailedResult>([\s\S]*?)<\/SendSmsDetailedResult>/);
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

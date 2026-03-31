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
    // Read HYP config from site_content table
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
    const HYP_TERMINAL = config.terminal_number;
    const HYP_API_URL = config.api_url;
    const HYP_USER = config.user;
    const HYP_PASSWORD = config.password;

    if (!HYP_TERMINAL || !HYP_API_URL || !HYP_USER || !HYP_PASSWORD) {
      return new Response(JSON.stringify({ error: "HYP credentials incomplete" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, total, customer_name, customer_phone, success_url, error_url } = await req.json();

    if (!order_id || !total || !success_url || !error_url) {
      return new Response(JSON.stringify({ error: "Missing required fields: order_id, total, success_url, error_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInAgorot = Math.round(total * 100);

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<ashrait>
  <request>
    <command>doDeal</command>
    <requestId>${order_id}</requestId>
    <version>2000</version>
    <language>HE</language>
    <mayBeDuplicate>0</mayBeDuplicate>
    <doDeal>
      <terminalNumber>${HYP_TERMINAL}</terminalNumber>
      <cardNo>CGMPI</cardNo>
      <total>${amountInAgorot}</total>
      <transactionType>Debit</transactionType>
      <creditType>RegularCredit</creditType>
      <currency>ILS</currency>
      <transactionCode>Phone</transactionCode>
      <authNumber></authNumber>
      <numberOfPayments>1</numberOfPayments>
      <validation>TxnSetup</validation>
      <mid>${HYP_TERMINAL}</mid>
      <uniqueid>${Date.now()}</uniqueid>
      <mpiValidation>autoComm</mpiValidation>
      <userData1>${order_id}</userData1>
      <userData2>${customer_name || ""}</userData2>
      <userData3>${customer_phone || ""}</userData3>
      <successUrl>${success_url}</successUrl>
      <errorUrl>${error_url}</errorUrl>
      <cancelUrl>${error_url}</cancelUrl>
      <customerData>
        <userData1>${customer_name || ""}</userData1>
        <userData2>${customer_phone || ""}</userData2>
      </customerData>
    </doDeal>
  </request>
</ashrait>`;

    const response = await fetch(`${HYP_API_URL}/xpo/Relay`, {
      method: "POST",
      headers: { "Content-Type": "application/xml; charset=utf-8" },
      body: xmlPayload,
    });

    const result = await response.text();
    console.log("HYP response:", result);

    const urlMatch = result.match(/<mpiHostedPageUrl>(.*?)<\/mpiHostedPageUrl>/);
    if (urlMatch && urlMatch[1]) {
      return new Response(JSON.stringify({ 
        success: true, 
        payment_url: urlMatch[1],
        raw: result,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errorMatch = result.match(/<userMessage>(.*?)<\/userMessage>/);
    return new Response(JSON.stringify({ 
      error: errorMatch?.[1] || "Failed to create payment",
      raw: result,
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

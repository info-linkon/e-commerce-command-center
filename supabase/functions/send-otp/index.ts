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

    const { action, phone, code } = await req.json();

    if (!phone || typeof phone !== "string" || phone.length < 9) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/[\s\-()]/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "972" + normalizedPhone.substring(1);
    }
    if (!normalizedPhone.startsWith("972")) {
      normalizedPhone = "972" + normalizedPhone;
    }

    if (action === "send") {
      // Generate 4-digit code
      const otpCode = String(Math.floor(1000 + Math.random() * 9000));

      // Save to DB
      const { error: insertError } = await supabase
        .from("otp_codes")
        .insert({
          phone: normalizedPhone,
          code: otpCode,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        console.error("OTP insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save OTP" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Read SMS config (InforU/LINKON)
      const { data: smsConfig } = await supabase
        .from("site_content")
        .select("content")
        .eq("page", "settings")
        .eq("section", "inforu")
        .maybeSingle();

      if (!smsConfig?.content) {
        console.error("SMS config not found");
        return new Response(JSON.stringify({ error: "SMS not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = smsConfig.content as Record<string, string>;
      const { username, token, sender } = config;

      if (!username || !token) {
        return new Response(JSON.stringify({ error: "SMS credentials incomplete" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send SMS via LINKON API
      const smsBody = {
        Message: `קוד האימות שלך: ${otpCode}`,
        Recipients: [{ Phone: normalizedPhone }],
        Settings: {
          Sender: sender || "Elwejha",
        },
      };

      const basicAuth = btoa(`${username}:${token}`);
      const smsResponse = await fetch(
        "https://capi.inforu.co.il/api/v2/SMS/SendSms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify(smsBody),
        }
      );

      const smsResult = await smsResponse.json();
      console.log("SMS send result:", JSON.stringify(smsResult));

      // Log to notification_log (best-effort, code masked for security)
      try {
        const isOk = smsResponse.ok && smsResult?.StatusDescription !== "Error";
        const errorMsg = isOk ? null : (smsResult?.StatusDescription || smsResult?.Message || null);
        const providerMessageId = smsResult?.Data?.[0]?.MessageId
          ? String(smsResult.Data[0].MessageId)
          : (smsResult?.MessageId ? String(smsResult.MessageId) : null);
        await supabase.from("notification_log").insert({
          channel: "sms",
          event_key: "otp_code",
          recipient: normalizedPhone,
          body: "קוד אימות: ****",
          status: isOk ? "sent" : "failed",
          error: errorMsg,
          provider_message_id: providerMessageId,
          sent_at: isOk ? new Date().toISOString() : null,
          context: { sender: sender || "Elwejha" },
        });
      } catch (logErr) {
        console.error("Failed to log OTP SMS:", logErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return new Response(JSON.stringify({ error: "Code required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find matching OTP
      const { data: otpRow, error: otpError } = await supabase
        .from("otp_codes")
        .select("id, expires_at, verified")
        .eq("phone", normalizedPhone)
        .eq("code", code)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otpRow) {
        return new Response(JSON.stringify({ valid: false, error: "קוד שגוי" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (new Date(otpRow.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: "הקוד פג תוקף" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark verified
      await supabase
        .from("otp_codes")
        .update({ verified: true })
        .eq("id", otpRow.id);

      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("OTP error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 260;

function countChars(text: string): number {
  try {
    // deno-lint-ignore no-explicit-any
    const Seg = (Intl as any).Segmenter;
    if (Seg) return [...new Seg("he", { granularity: "grapheme" }).segment(text)].length;
  } catch { /* ignore */ }
  return [...text].length;
}

function normalizePhone(raw: string): string | null {
  let p = String(raw || "").replace(/[\s\-()\u200E\u200F]/g, "").replace(/\D/g, "");
  if (!p) return null;
  if (p.startsWith("0")) p = "972" + p.substring(1);
  if (!p.startsWith("972")) p = "972" + p;
  return /^972\d{9}$/.test(p) ? p : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const message: string = typeof body?.message === "string" ? body.message.trim() : "";
    const recipients: { phone?: string; name?: string | null; customer_id?: string | null }[] =
      Array.isArray(body?.recipients) ? body.recipients : [];

    if (!message) {
      return new Response(JSON.stringify({ error: "תוכן ההודעה חסר" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (countChars(message) > MAX_CHARS) {
      return new Response(JSON.stringify({ error: `ההודעה ארוכה מ-${MAX_CHARS} תווים` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (recipients.length === 0 || recipients.length > 2000) {
      return new Response(JSON.stringify({ error: "רשימת נמענים לא תקינה" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const seen = new Set<string>();
    const details: { phone: string; name?: string | null; status: string; error?: string }[] = [];
    let sent = 0, failed = 0, skipped = 0;

    const valid: { phone: string; name?: string | null; customer_id?: string | null }[] = [];
    for (const r of recipients) {
      const phone = normalizePhone(r.phone || "");
      if (!phone) {
        skipped++;
        details.push({ phone: r.phone || "", name: r.name, status: "skipped", error: "מספר לא תקין" });
        continue;
      }
      if (seen.has(phone)) {
        skipped++;
        details.push({ phone, name: r.name, status: "skipped", error: "כפול" });
        continue;
      }
      seen.add(phone);
      valid.push({ ...r, phone });
    }

    const BATCH = 10;
    for (let i = 0; i < valid.length; i += BATCH) {
      const batch = valid.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (r) => {
          const personalized = message
            .replace(/{customer_name}/g, r.name || "")
            .replace(/{phone}/g, r.phone);
          try {
            const { data, error } = await supabase.functions.invoke("send-sms", {
              body: {
                phone: r.phone,
                message: personalized,
                event_key: "manual_campaign",
                context: { customer_id: r.customer_id || null, customer_name: r.name || null },
              },
            });
            if (error) throw new Error(error.message);
            if (data && data.success === false) throw new Error(data.error || "שליחה נכשלה");
            return { phone: r.phone, name: r.name, status: "sent" };
          } catch (e) {
            return {
              phone: r.phone,
              name: r.name,
              status: "failed",
              error: e instanceof Error ? e.message : "שגיאה",
            };
          }
        }),
      );
      for (const res of results) {
        if (res.status === "sent") sent++; else failed++;
        details.push(res);
      }
      if (i + BATCH < valid.length) await new Promise((r) => setTimeout(r, 400));
    }

    return new Response(JSON.stringify({ sent, failed, skipped, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-bulk-sms error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
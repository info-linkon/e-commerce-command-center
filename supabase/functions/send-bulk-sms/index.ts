import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 260;
/** InfoRu accepts an array of recipients per call; keep chunks conservative. */
const CHUNK = 100;

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

interface Recipient { phone: string; name?: string | null; customer_id?: string | null }
interface Detail { phone: string; name?: string | null; status: string; error?: string }

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
    const recipients: Recipient[] = Array.isArray(body?.recipients) ? body.recipients : [];

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
    if (recipients.length === 0 || recipients.length > 5000) {
      return new Response(JSON.stringify({ error: "רשימת נמענים לא תקינה" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- InfoRu credentials (same source as send-sms) ----
    const { data: config } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "inforu")
      .maybeSingle();
    const inforuConfig = config?.content as Record<string, string> | null;
    const username = inforuConfig?.username || Deno.env.get("INFORU_USERNAME");
    const apiToken = inforuConfig?.token || Deno.env.get("INFORU_TOKEN");
    const sender = inforuConfig?.sender || Deno.env.get("INFORU_SENDER") || "ELWEJHA";

    if (!username || !apiToken) {
      return new Response(JSON.stringify({ error: "InforU credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const basicAuth = btoa(`${username}:${apiToken}`);

    // ---- Validate + dedupe ----
    const seen = new Set<string>();
    const details: Detail[] = [];
    const logRows: Record<string, unknown>[] = [];
    let sent = 0, failed = 0, skipped = 0;

    const valid: Recipient[] = [];
    for (const r of recipients) {
      const phone = normalizePhone(r.phone || "");
      if (!phone) {
        skipped++;
        details.push({ phone: r.phone || "", name: r.name, status: "skipped", error: "מספר לא תקין" });
        logRows.push({
          channel: "sms", event_key: "manual_campaign", recipient: String(r.phone || ""),
          body: message, status: "failed", error: "Invalid phone format",
          context: { customer_id: r.customer_id || null, customer_name: r.name || null, sender },
        });
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

    // ---- Group by final message text (personalization), then chunk ----
    const groups = new Map<string, Recipient[]>();
    for (const r of valid) {
      const text = message
        .replace(/{customer_name}/g, r.name || "")
        .replace(/{phone}/g, r.phone);
      const arr = groups.get(text);
      if (arr) arr.push(r); else groups.set(text, [r]);
    }

    async function sendChunk(text: string, chunk: Recipient[]) {
      const payload = {
        Message: text,
        Recipients: chunk.map((r) => ({ Phone: r.phone })),
        Settings: { Sender: sender },
      };
      let ok = false;
      let errMsg = "שליחה נכשלה";
      let providerId: string | null = null;
      try {
        const res = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Basic ${basicAuth}` },
          body: JSON.stringify(payload),
        });
        const raw = await res.text();
        let parsed: Record<string, unknown>;
        try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
        // deno-lint-ignore no-explicit-any
        const p = parsed as any;
        ok = res.ok && p?.StatusDescription !== "Error" && p?.StatusId !== -1;
        if (!ok) errMsg = p?.StatusDescription || p?.Message || raw || errMsg;
        providerId = p?.Data?.BatchId ? String(p.Data.BatchId) : (p?.Data?.[0]?.MessageId ? String(p.Data[0].MessageId) : null);
      } catch (e) {
        ok = false;
        errMsg = e instanceof Error ? e.message : "שגיאת רשת";
      }

      for (const r of chunk) {
        if (ok) sent++; else failed++;
        details.push({ phone: r.phone, name: r.name, status: ok ? "sent" : "failed", error: ok ? undefined : errMsg });
        logRows.push({
          channel: "sms", event_key: "manual_campaign", recipient: r.phone, body: text,
          status: ok ? "sent" : "failed", error: ok ? null : errMsg,
          provider_message_id: providerId,
          sent_at: ok ? new Date().toISOString() : null,
          context: { customer_id: r.customer_id || null, customer_name: r.name || null, sender },
        });
      }
    }

    /**
     * Personalized campaigns produce a different wording per recipient.
     * InfoRu's documented way to handle that is the "Multiple Requests"
     * gateway (InforuRoot), recommended up to ~50 packages per request —
     * instead of one HTTP call per recipient.
     */
    function xmlEscape(s: string): string {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    async function sendPackages(entries: [string, Recipient[]][]) {
      const xml =
        "<InforuRoot>" +
        entries.map(([text, list]) =>
          "<Inforu><User><Username>" + xmlEscape(username!) + "</Username><ApiToken>" +
          xmlEscape(apiToken!) + "</ApiToken></User><Content Type=\"sms\"><Message><![CDATA[" +
          text + "]]></Message></Content><Recipients><PhoneNumber>" +
          list.map((r) => r.phone).join(";") +
          "</PhoneNumber></Recipients><Settings><Sender>" + xmlEscape(sender) +
          "</Sender></Settings></Inforu>"
        ).join("") +
        "</InforuRoot>";

      let ok = false;
      let errMsg = "שליחה נכשלה";
      try {
        const res = await fetch("https://api.inforu.co.il/SendMessageXml.ashx", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body: "InforuXML=" + encodeURIComponent(xml),
        });
        const raw = await res.text();
        ok = res.ok && /<Status>\s*1\s*<\/Status>/.test(raw);
        if (!ok) errMsg = (raw.match(/<Description>([^<]*)<\/Description>/)?.[1] || raw).slice(0, 300);
      } catch (e) {
        ok = false;
        errMsg = e instanceof Error ? e.message : "שגיאת רשת";
      }

      for (const [text, list] of entries) {
        for (const r of list) {
          if (ok) sent++; else failed++;
          details.push({ phone: r.phone, name: r.name, status: ok ? "sent" : "failed", error: ok ? undefined : errMsg });
          logRows.push({
            channel: "sms", event_key: "manual_campaign", recipient: r.phone, body: text,
            status: ok ? "sent" : "failed", error: ok ? null : errMsg,
            sent_at: ok ? new Date().toISOString() : null,
            context: { customer_id: r.customer_id || null, customer_name: r.name || null, sender },
          });
        }
      }
    }

    if (groups.size === 1) {
      // Same text for everyone: one call per 100 recipients (REST v2).
      const [text, list] = [...groups][0];
      for (let i = 0; i < list.length; i += CHUNK) {
        await sendChunk(text, list.slice(i, i + CHUNK));
      }
    } else {
      // Personalized: up to 50 packages (wordings) per gateway request.
      const entries = [...groups];
      for (let i = 0; i < entries.length; i += 50) {
        await sendPackages(entries.slice(i, i + 50));
      }
    }

    // ---- Bulk log (chunked inserts, best-effort) ----
    for (let i = 0; i < logRows.length; i += 200) {
      try {
        await supabase.from("notification_log").insert(logRows.slice(i, i + 200));
      } catch (e) {
        console.error("notification_log insert failed:", e);
      }
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

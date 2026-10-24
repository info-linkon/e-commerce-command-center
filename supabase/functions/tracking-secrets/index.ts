// Admin-only endpoint behind the CRM page "חיבור שרת לפרסום". Saves the
// access tokens used by _shared/server-conversions.ts into a private storage
// bucket and reports which ones are set. Token values are never returned —
// only whether each one is set plus its last 4 characters.
//
// POST { action: "status" }
// POST { action: "save", values: { ga4_api_secret?: string | null, … } }
//   string → set, "" / null → clear, missing → unchanged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readStoredSecrets, SECRET_KEYS, TrackingSecrets, writeStoredSecrets } from "../_shared/tracking-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function describe(stored: TrackingSecrets) {
  const status: Record<string, { set: boolean; hint: string | null; source: "crm" | "env" | null }> = {};
  for (const k of SECRET_KEYS) {
    const fromCrm = stored[k];
    const fromEnv = Deno.env.get(k.toUpperCase());
    const v = fromCrm || fromEnv;
    status[k] = {
      set: !!v,
      // The measurement id is not secret — show it in full.
      hint: v ? (k === "ga4_measurement_id" ? v : `…${v.slice(-4)}`) : null,
      source: fromCrm ? "crm" : fromEnv ? "env" : null,
    };
  }
  return status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "status";

    if (action === "status") {
      return json({ success: true, status: describe(await readStoredSecrets(admin)) });
    }

    if (action === "save") {
      const values = (body?.values || {}) as Record<string, unknown>;
      const next: TrackingSecrets = await readStoredSecrets(admin);
      for (const k of SECRET_KEYS) {
        if (!(k in values)) continue;
        const v = values[k];
        if (v === null || v === "") delete next[k];
        else if (typeof v === "string") next[k] = v.trim().slice(0, 1000);
      }
      if (next.ga4_measurement_id && !/^G-[A-Z0-9]+$/i.test(next.ga4_measurement_id)) {
        return json({ error: "Measurement ID חייב להתחיל ב-G- (למשל G-M0ST7YDS0C)" }, 400);
      }
      await writeStoredSecrets(admin, next);
      return json({ success: true, status: describe(next) });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("tracking-secrets error:", msg);
    return json({ error: msg }, 500);
  }
});

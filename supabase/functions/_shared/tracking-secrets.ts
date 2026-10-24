// Access tokens for the server-side conversion APIs (GA4 Measurement
// Protocol, Meta Conversions API, TikTok Events API).
//
// Entered by an admin in the CRM (Settings › חיבור שרת לפרסום) through the
// `tracking-secrets` edge function and stored as a JSON object in a PRIVATE
// storage bucket — never in `site_content`, which is publicly readable.
// Only the service role can read it. Edge Function secrets with the same
// names (upper-case) still work as a fallback.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SECRETS_BUCKET = "private-config";
export const SECRETS_PATH = "tracking-secrets.json";

export type TrackingSecrets = {
  ga4_api_secret?: string;
  ga4_measurement_id?: string;
  meta_capi_access_token?: string;
  tiktok_events_access_token?: string;
};

export const SECRET_KEYS: (keyof TrackingSecrets)[] = [
  "ga4_api_secret",
  "ga4_measurement_id",
  "meta_capi_access_token",
  "tiktok_events_access_token",
];

/** Raw stored values (no env fallback). Missing bucket/file → {}. */
export async function readStoredSecrets(supabase: SupabaseClient): Promise<TrackingSecrets> {
  try {
    const { data, error } = await supabase.storage.from(SECRETS_BUCKET).download(SECRETS_PATH);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    const out: TrackingSecrets = {};
    for (const k of SECRET_KEYS) {
      const v = parsed?.[k];
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export async function writeStoredSecrets(supabase: SupabaseClient, secrets: TrackingSecrets): Promise<void> {
  // Create the private bucket on first save (no migration needed).
  const { data: bucket } = await supabase.storage.getBucket(SECRETS_BUCKET);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(SECRETS_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  } else if (bucket.public) {
    throw new Error(`bucket ${SECRETS_BUCKET} is public — refusing to store secrets in it`);
  }
  const body = new Blob([JSON.stringify(secrets)], { type: "application/json" });
  const { error } = await supabase.storage.from(SECRETS_BUCKET).upload(SECRETS_PATH, body, {
    upsert: true,
    contentType: "application/json",
  });
  if (error) throw error;
}

/** Stored values, falling back to Edge Function secrets (GA4_API_SECRET, …). */
export async function loadTrackingSecrets(supabase: SupabaseClient): Promise<TrackingSecrets> {
  const stored = await readStoredSecrets(supabase);
  const out: TrackingSecrets = {};
  for (const k of SECRET_KEYS) {
    const v = stored[k] || Deno.env.get(k.toUpperCase());
    if (v) out[k] = v;
  }
  return out;
}

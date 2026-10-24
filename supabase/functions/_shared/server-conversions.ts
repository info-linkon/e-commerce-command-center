// Server-side purchase events for Google Analytics 4 (Measurement Protocol),
// Meta (Conversions API) and TikTok (Events API).
//
// Why: browser pixels lose purchases (ad blockers, in-app browsers, customers
// closing the tab before the thank-you page). The edge functions know about
// every paid/placed order, so they report it too:
//   - cash orders  → from web-create-order, right after the order is created
//   - credit orders → from runHypVerify (hyp-callback / hyp-notify), once HYP
//                     confirms the payment
// The browser sends the same purchase with the same ids, and each platform
// dedupes the pair: GA4 by transaction_id, Meta by event_id (eventID),
// TikTok by event_id.
//
// Only website orders are reported (POS orders paid through a payment link
// are not website purchases), never test orders, and at most once per order
// (guarded by a `server_conversion` row in payment_events).
//
// Configuration: access tokens are entered in the CRM (Settings › חיבור שרת
// לפרסום) and read via _shared/tracking-secrets.ts — every platform is skipped
// while its token is missing. Pixel ids are read from the CRM settings
// (site_content settings/meta_pixel and settings/tiktok_pixel), the same ones
// the storefront uses.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTrackingSecrets, TrackingSecrets } from "./tracking-secrets.ts";

const DEFAULT_GA4_MEASUREMENT_ID = "G-M0ST7YDS0C";
const META_GRAPH_VERSION = "v21.0";
const REQUEST_TIMEOUT_MS = 8000;

/** Must match `purchaseEventId` in src/lib/attribution.ts. */
export function purchaseEventId(orderNumber: string | number): string {
  return `purchase-${orderNumber}`;
}

/** Must match `isTestOrderName` in src/lib/attribution.ts. */
export function isTestOrderName(name?: string | null): boolean {
  return /(^|[\s\-_])(test|tst|טסט|בדיקה|تجربة|تجربه|اختبار)([\s\-_]|$)/i.test(String(name || "").trim());
}

export type TrackingContext = {
  ga_client_id?: string;
  ga_session_id?: string;
  fbp?: string;
  fbc?: string;
  ttp?: string;
  ttclid?: string;
  external_id?: string;
  page_url?: string;
  user_agent?: string;
  ip?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  landing_page?: string;
};

const TRACKING_KEYS: (keyof TrackingContext)[] = [
  "ga_client_id", "ga_session_id", "fbp", "fbc", "ttp", "ttclid", "external_id", "page_url",
  "user_agent", "ip", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "landing_page",
];

/** Keep only known string fields (the payload comes from the public checkout). */
export function sanitizeTrackingContext(raw: unknown, req?: Request): TrackingContext {
  const ctx: TrackingContext = {};
  if (raw && typeof raw === "object") {
    for (const k of TRACKING_KEYS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "string" && v.trim()) ctx[k] = v.trim().slice(0, 500);
    }
  }
  if (req) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      || req.headers.get("cf-connecting-ip") || "";
    if (ip) ctx.ip = ip;
    if (!ctx.user_agent) {
      const ua = req.headers.get("user-agent");
      if (ua) ctx.user_agent = ua.slice(0, 500);
    }
  }
  return ctx;
}

/** Store the checkout's tracking context so the HYP notify (later, server-to-server) can use it. */
export async function saveTrackingContext(
  supabase: SupabaseClient,
  orderId: string,
  ctx: TrackingContext,
): Promise<void> {
  try {
    await supabase.from("payment_events").insert({
      order_id: orderId,
      event_type: "tracking_context",
      success: true,
      message: ctx.utm_source ? `utm_source=${ctx.utm_source}` : null,
      metadata: ctx,
    });
  } catch (err) {
    console.error("saveTrackingContext failed (non-blocking):", err);
  }
}

async function loadTrackingContext(supabase: SupabaseClient, orderId: string): Promise<TrackingContext> {
  const { data } = await supabase
    .from("payment_events")
    .select("metadata")
    .eq("order_id", orderId)
    .eq("event_type", "tracking_context")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.metadata as TrackingContext | null) || {}) as TrackingContext;
}

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Digits with country code, e.g. "0521234567" → "972521234567". */
export function normalizePhone(phone?: string | null): string {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  else if (!digits.startsWith("972") && digits.length <= 10) digits = `972${digits}`;
  return digits;
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<{ ok: boolean; status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text: text.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, text: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

type OrderForConversion = {
  id: string;
  order_number: number;
  total: number;
  source: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_cost: number | null;
  created_at: string;
};

type Line = { sku: string; name: string; quantity: number; price: number };

async function loadLines(supabase: SupabaseClient, orderId: string): Promise<Line[]> {
  const { data: rows } = await supabase
    .from("order_items")
    .select("quantity, unit_price, variation_id, bundle_variation_id")
    .eq("order_id", orderId);
  const lines: Line[] = [];
  for (const row of rows || []) {
    let sku = "";
    let name = "";
    // Same SKU resolution as order-summary (which feeds the browser Purchase),
    // so content ids match the catalog feed and the browser event.
    if (row.variation_id) {
      const { data: v } = await supabase
        .from("product_variations")
        .select("sku, product_id")
        .eq("id", row.variation_id)
        .maybeSingle();
      sku = (v?.sku as string) || "";
      if (v?.product_id) {
        const { data: p } = await supabase
          .from("products")
          .select("sku, name, name_ar")
          .eq("id", v.product_id)
          .maybeSingle();
        name = (p?.name as string) || (p?.name_ar as string) || "";
        if (!sku) sku = (p?.sku as string) || "";
      }
    }
    if (row.bundle_variation_id) {
      const { data: bv } = await supabase
        .from("bundle_variations")
        .select("sku")
        .eq("id", row.bundle_variation_id)
        .maybeSingle();
      sku = (bv?.sku as string) || sku;
    }
    lines.push({
      sku,
      name,
      quantity: Number(row.quantity || 1),
      price: Number(row.unit_price || 0),
    });
  }
  return lines;
}

async function readPixelId(supabase: SupabaseClient, section: string): Promise<string | null> {
  const { data } = await supabase
    .from("site_content")
    .select("content")
    .eq("page", "settings")
    .eq("section", section)
    .maybeSingle();
  const id = (data?.content as Record<string, unknown> | null)?.pixel_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

type PlatformResult = { platform: string; ok: boolean; skipped?: string; status?: number; detail?: string };

async function sendGa4(secrets: TrackingSecrets, order: OrderForConversion, lines: Line[], ctx: TrackingContext, value: number): Promise<PlatformResult> {
  const apiSecret = secrets.ga4_api_secret;
  if (!apiSecret) return { platform: "ga4", ok: false, skipped: "no_api_secret" };
  const measurementId = secrets.ga4_measurement_id || DEFAULT_GA4_MEASUREMENT_ID;
  // Without the browser's client id GA still records the revenue, just
  // without the session's traffic source.
  const clientId = ctx.ga_client_id || `${Math.floor(Math.random() * 1e9)}.${Math.floor(Date.now() / 1000)}`;
  const params: Record<string, unknown> = {
    transaction_id: String(order.order_number),
    currency: "ILS",
    value,
    shipping: Number(order.shipping_cost || 0) || undefined,
    items: lines.filter((l) => l.sku).map((l) => ({
      item_id: l.sku,
      item_name: l.name || undefined,
      price: l.price,
      quantity: l.quantity,
    })),
    engagement_time_msec: 1,
  };
  if (ctx.ga_session_id) params.session_id = ctx.ga_session_id;
  const res = await postJson(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    { client_id: clientId, events: [{ name: "purchase", params }] },
  );
  return { platform: "ga4", ok: res.ok, status: res.status, detail: res.ok ? undefined : res.text };
}

async function sendMeta(
  secrets: TrackingSecrets,
  supabase: SupabaseClient,
  order: OrderForConversion,
  lines: Line[],
  ctx: TrackingContext,
  value: number,
  eventId: string,
): Promise<PlatformResult> {
  const token = secrets.meta_capi_access_token;
  if (!token) return { platform: "meta", ok: false, skipped: "no_access_token" };
  const pixelId = await readPixelId(supabase, "meta_pixel");
  if (!pixelId) return { platform: "meta", ok: false, skipped: "no_pixel_id" };

  const userData: Record<string, unknown> = { country: [await sha256("il")] };
  const email = String(order.customer_email || "").trim().toLowerCase();
  const phone = normalizePhone(order.customer_phone);
  if (email) userData.em = [await sha256(email)];
  if (phone) userData.ph = [await sha256(phone)];
  const nameParts = String(order.customer_name || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (nameParts[0]) userData.fn = [await sha256(nameParts[0])];
  if (nameParts.length > 1) userData.ln = [await sha256(nameParts.slice(1).join(" "))];
  if (ctx.external_id) userData.external_id = [await sha256(ctx.external_id)];
  if (ctx.ip) userData.client_ip_address = ctx.ip;
  if (ctx.user_agent) userData.client_user_agent = ctx.user_agent;
  if (ctx.fbp) userData.fbp = ctx.fbp;
  if (ctx.fbc) userData.fbc = ctx.fbc;

  const contents = lines.filter((l) => l.sku).map((l) => ({ id: l.sku, quantity: l.quantity, item_price: l.price }));
  const customData: Record<string, unknown> = {
    currency: "ILS",
    value,
    order_id: String(order.order_number),
    content_type: "product",
    num_items: lines.reduce((s, l) => s + l.quantity, 0) || undefined,
  };
  if (contents.length) {
    customData.contents = contents;
    customData.content_ids = contents.map((c) => c.id);
  }

  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };
  if (ctx.page_url) event.event_source_url = ctx.page_url;

  const res = await postJson(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
    { data: [event] },
  );
  return { platform: "meta", ok: res.ok, status: res.status, detail: res.ok ? undefined : res.text };
}

async function sendTikTok(
  secrets: TrackingSecrets,
  supabase: SupabaseClient,
  order: OrderForConversion,
  lines: Line[],
  ctx: TrackingContext,
  value: number,
  eventId: string,
): Promise<PlatformResult> {
  const token = secrets.tiktok_events_access_token;
  if (!token) return { platform: "tiktok", ok: false, skipped: "no_access_token" };
  const pixelCode = await readPixelId(supabase, "tiktok_pixel");
  if (!pixelCode) return { platform: "tiktok", ok: false, skipped: "no_pixel_id" };

  const user: Record<string, unknown> = {};
  const email = String(order.customer_email || "").trim().toLowerCase();
  const phone = normalizePhone(order.customer_phone);
  if (email) user.email = await sha256(email);
  if (phone) user.phone = await sha256(`+${phone}`);
  if (ctx.external_id) user.external_id = await sha256(ctx.external_id);
  if (ctx.ttclid) user.ttclid = ctx.ttclid;
  if (ctx.ttp) user.ttp = ctx.ttp;
  if (ctx.ip) user.ip = ctx.ip;
  if (ctx.user_agent) user.user_agent = ctx.user_agent;

  const withSku = lines.filter((l) => l.sku);
  const contents = (withSku.length ? withSku : [{ sku: `order-${order.order_number}`, quantity: 1, price: value, name: "" }])
    .map((l) => ({ content_id: l.sku, content_type: "product", quantity: l.quantity, price: l.price }));
  const properties = {
    currency: "ILS",
    value,
    contents,
    content_type: "product",
    order_id: String(order.order_number),
  };
  const eventTime = Math.floor(Date.now() / 1000);
  const page = ctx.page_url ? { url: ctx.page_url } : undefined;
  // The browser sends both CompletePayment and Purchase (see
  // src/lib/tiktok-pixel.ts) — mirror both with matching event ids.
  const data = [
    { event: "CompletePayment", event_time: eventTime, event_id: eventId, user, properties, page },
    { event: "Purchase", event_time: eventTime, event_id: `${eventId}-p`, user, properties, page },
  ];
  const res = await postJson(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    { event_source: "web", event_source_id: pixelCode, data },
    { "Access-Token": token },
  );
  // TikTok answers HTTP 200 with a non-zero `code` on errors.
  let ok = res.ok;
  try {
    ok = ok && JSON.parse(res.text).code === 0;
  } catch {
    // keep HTTP status
  }
  return { platform: "tiktok", ok, status: res.status, detail: ok ? undefined : res.text };
}

/**
 * Report a website purchase to GA4 / Meta / TikTok from the server.
 * Never throws — failures are logged to payment_events.
 */
export async function sendServerPurchase(
  supabase: SupabaseClient,
  orderId: string,
  opts: { trigger: string; value?: number; tracking?: TrackingContext } = { trigger: "unknown" },
): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("id, order_number, total, source, status, customer_name, customer_email, customer_phone, shipping_cost, created_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;
    const o = order as OrderForConversion;
    if (o.source !== "website") return;
    if (o.status === "cancelled") return;
    if (isTestOrderName(o.customer_name)) return;

    // Once per order: hyp-callback and hyp-notify can both confirm the same payment.
    const { data: already } = await supabase
      .from("payment_events")
      .select("id")
      .eq("order_id", orderId)
      .eq("event_type", "server_conversion")
      .limit(1)
      .maybeSingle();
    if (already) return;
    // Claim the slot before sending so a concurrent caller backs off.
    const { data: claim, error: claimErr } = await supabase
      .from("payment_events")
      .insert({ order_id: orderId, event_type: "server_conversion", success: false, message: `sending (${opts.trigger})` })
      .select("id")
      .single();
    if (claimErr || !claim) return;

    const value = Number(opts.value ?? o.total);
    if (!isFinite(value) || value <= 0) {
      await supabase.from("payment_events").update({ message: "skipped: non-positive value" }).eq("id", claim.id);
      return;
    }

    const secrets = await loadTrackingSecrets(supabase);
    const ctx = opts.tracking || await loadTrackingContext(supabase, orderId);
    const lines = await loadLines(supabase, orderId);
    const eventId = purchaseEventId(o.order_number);

    const results = await Promise.all([
      sendGa4(secrets, o, lines, ctx, value),
      sendMeta(secrets, supabase, o, lines, ctx, value, eventId),
      sendTikTok(secrets, supabase, o, lines, ctx, value, eventId),
    ]);
    const sent = results.filter((r) => r.ok).map((r) => r.platform);
    const failed = results.filter((r) => !r.ok && !r.skipped);
    const skipped = results.filter((r) => r.skipped).map((r) => `${r.platform}:${r.skipped}`);
    await supabase
      .from("payment_events")
      .update({
        success: failed.length === 0 && sent.length > 0,
        message: `trigger=${opts.trigger} sent=[${sent.join(",")}]${failed.length ? ` failed=[${failed.map((f) => f.platform).join(",")}]` : ""}${skipped.length ? ` skipped=[${skipped.join(",")}]` : ""}`,
        metadata: { event_id: eventId, value, results },
      })
      .eq("id", claim.id);
    if (failed.length) console.error("server conversion failures:", JSON.stringify(failed));
  } catch (err) {
    console.error("sendServerPurchase failed (non-blocking):", err);
  }
}

/** Run `promise` after the response is sent when the runtime supports it. */
export function runInBackground(promise: Promise<unknown>): Promise<unknown> | void {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === "function") {
    rt.waitUntil(promise);
    return;
  }
  return promise;
}

// Visitor attribution + tracking context for server-side conversions.
//
// Purchases are sent to Google / Meta / TikTok from our edge functions as
// well as from the browser (ad blockers, closed tabs and in-app browsers
// drop a lot of browser events). The server events only attribute well when
// they carry the same browser identifiers the pixels use, so checkout sends
// this context along with the order.

import { getExternalId } from "@/lib/meta-pixel";
import { GA_MEASUREMENT_ID } from "@/lib/gtag";

const CLICK_KEY = "elw_click_ids";
const CLICK_TTL_MS = 28 * 24 * 60 * 60 * 1000;

type ClickIds = {
  fbclid?: string;
  fbclid_at?: number;
  ttclid?: string;
  gclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  saved_at?: number;
};

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
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  landing_page?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function loadClickIds(): ClickIds {
  try {
    const raw = JSON.parse(localStorage.getItem(CLICK_KEY) || "{}") as ClickIds;
    if (raw.saved_at && Date.now() - raw.saved_at > CLICK_TTL_MS) return {};
    return raw;
  } catch {
    return {};
  }
}

/** Remember ad click ids / UTM params from the landing URL (last click wins). */
export function captureClickIds(search: string = typeof window !== "undefined" ? window.location.search : ""): void {
  const params = new URLSearchParams(search);
  const keys = ["fbclid", "ttclid", "gclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
  if (!keys.some((k) => params.get(k))) return;
  const next: ClickIds = { ...loadClickIds() };
  // A new campaign visit replaces the previous campaign's params.
  if (params.get("utm_source") || params.get("utm_campaign")) {
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) delete next[k];
  }
  for (const k of keys) {
    const v = params.get(k);
    if (v) next[k] = v;
  }
  if (params.get("fbclid")) next.fbclid_at = Date.now();
  next.landing_page = window.location.pathname + window.location.search;
  next.saved_at = Date.now();
  try {
    localStorage.setItem(CLICK_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** `_ga` cookie "GA1.1.123.456" → client id "123.456". */
export function parseGaClientId(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const parts = cookie.split(".");
  return parts.length >= 4 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : undefined;
}

/** `_ga_<id>` cookie (GS1 "GS1.1.1700000000.3..." or GS2 "GS2.1.s1700000000$o3...") → session id. */
export function parseGaSessionId(cookie?: string): string | undefined {
  if (!cookie) return undefined;
  const gs2 = cookie.match(/^GS2\.\d+\.s(\d+)/);
  if (gs2) return gs2[1];
  const parts = cookie.split(".");
  return parts[0] === "GS1" && parts[2] && /^\d+$/.test(parts[2]) ? parts[2] : undefined;
}

export function getTrackingContext(): TrackingContext {
  if (typeof window === "undefined") return {};
  const clicks = loadClickIds();
  const gaSuffix = GA_MEASUREMENT_ID.replace(/^G-/, "");
  let fbc = readCookie("_fbc");
  if (!fbc && clicks.fbclid) fbc = `fb.1.${clicks.fbclid_at || Date.now()}.${clicks.fbclid}`;
  const ctx: TrackingContext = {
    ga_client_id: parseGaClientId(readCookie("_ga")),
    ga_session_id: parseGaSessionId(readCookie(`_ga_${gaSuffix}`)),
    fbp: readCookie("_fbp"),
    fbc,
    ttp: readCookie("_ttp"),
    ttclid: clicks.ttclid,
    gclid: clicks.gclid,
    external_id: getExternalId() || undefined,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    utm_source: clicks.utm_source,
    utm_medium: clicks.utm_medium,
    utm_campaign: clicks.utm_campaign,
    utm_content: clicks.utm_content,
    utm_term: clicks.utm_term,
    landing_page: clicks.landing_page,
  };
  for (const k of Object.keys(ctx) as (keyof TrackingContext)[]) if (!ctx[k]) delete ctx[k];
  return ctx;
}

/** Shared purchase event id — must match `purchaseEventId` in supabase/functions/_shared/server-conversions.ts. */
export function purchaseEventId(orderNumber: string | number): string {
  return `purchase-${orderNumber}`;
}

/** Test orders (e.g. "mhmd tst") must not be reported as purchases. */
export function isTestOrderName(name?: string | null): boolean {
  return /(^|[\s\-_])(test|tst|טסט|בדיקה|تجربة|تجربه|اختبار)([\s\-_]|$)/i.test(String(name || "").trim());
}

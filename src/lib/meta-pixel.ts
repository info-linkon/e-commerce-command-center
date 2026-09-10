// Meta Pixel helper
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

let metaPixelId: string | null = null;

export function setMetaPixelId(id: string | null) {
  metaPixelId = id || null;
}

/** E.164-ish normalization for Israeli numbers (Meta/TikTok advanced matching). */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  else if (!digits.startsWith("972") && digits.length <= 10) digits = `972${digits}`;
  return digits;
}

export function normalizeEmail(email?: string | null): string {
  return email ? String(email).trim().toLowerCase() : "";
}

/**
 * Advanced matching: re-init the pixel with the customer's email/phone so
 * Meta can attribute the event to a person. Meta hashes these client-side.
 */
export function fbqIdentify(user: { email?: string | null; phone?: string | null; name?: string | null }) {
  if (typeof window === "undefined" || !window.fbq || !metaPixelId) return;
  const em = normalizeEmail(user.email);
  const ph = normalizePhone(user.phone);
  if (!em && !ph) return;
  const data: Record<string, string> = {};
  if (em) data.em = em;
  if (ph) data.ph = ph;
  const parts = (user.name || "").trim().split(/\s+/);
  if (parts[0]) data.fn = parts[0].toLowerCase();
  if (parts.length > 1) data.ln = parts.slice(1).join(" ").toLowerCase();
  data.country = "il";
  try {
    window.fbq("init", metaPixelId, data);
  } catch {
    // ignore
  }
}

export function fbq(event: string, data?: Record<string, any>) {
  if (typeof window !== "undefined" && window.fbq) {
    if (!(window.fbq as any)?.loaded) {
      // queued — fbq base script keeps a queue and replays on init
      console.debug("[meta-pixel] queued event before init:", event);
    }
    if (data) {
      window.fbq("track", event, data);
    } else {
      window.fbq("track", event);
    }
  }
}

export function fbqPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

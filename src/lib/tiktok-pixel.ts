// TikTok Pixel helper — mirrors src/lib/meta-pixel.ts
import { normalizeEmail, normalizePhone } from "@/lib/meta-pixel";
declare global {
  interface Window {
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

export function ttq(event: string, data?: Record<string, any>) {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    if (data) {
      window.ttq.track(event, data);
    } else {
      window.ttq.track(event);
    }
  } catch (err) {
    console.debug("[tiktok-pixel] track error:", err);
  }
}

/** Advanced matching for TikTok — the SDK hashes the values client-side. */
export function ttqIdentify(user: { email?: string | null; phone?: string | null }) {
  if (typeof window === "undefined" || !window.ttq) return;
  const email = normalizeEmail(user.email);
  const phone_number = normalizePhone(user.phone);
  if (!email && !phone_number) return;
  try {
    window.ttq.identify({
      ...(email ? { email } : {}),
      ...(phone_number ? { phone_number: `+${phone_number}` } : {}),
    });
  } catch (err) {
    console.debug("[tiktok-pixel] identify error:", err);
  }
}

export function ttqPageView() {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.page();
  } catch (err) {
    console.debug("[tiktok-pixel] page error:", err);
  }
}
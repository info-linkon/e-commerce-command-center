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
export function ttqIdentify(user: { email?: string | null; phone?: string | null; external_id?: string | null }) {
  if (typeof window === "undefined" || !window.ttq) return;
  const email = normalizeEmail(user.email);
  const phone_number = normalizePhone(user.phone);
  const external_id = user.external_id || undefined;
  if (!email && !phone_number && !external_id) return;
  try {
    window.ttq.identify({
      ...(email ? { email } : {}),
      ...(phone_number ? { phone_number: `+${phone_number}` } : {}),
      ...(external_id ? { external_id } : {}),
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
/**
 * TikTok purchase event.
 * TikTok reports issues against "Purchase", while the pixel SDK documents
 * "CompletePayment" — we send both so whichever the ad account tracks
 * carries a valid numeric value and a non-empty content_id.
 */
export function ttqPurchase(
  value: number,
  contents: { id: string; quantity: number; price?: number }[],
  orderNumber?: string | number | null,
) {
  const numericValue = Number(Number(value).toFixed(2));
  if (!isFinite(numericValue) || numericValue <= 0) return;

  const list = (contents || []).filter((c) => c && String(c.id).trim());
  const payloadContents = (list.length
    ? list
    : [{ id: `order-${orderNumber ?? "unknown"}`, quantity: 1 }]
  ).map((c) => ({
    content_id: String(c.id),
    content_type: "product",
    quantity: Number(c.quantity || 1),
    ...(c.price ? { price: Number(Number(c.price).toFixed(2)) } : {}),
  }));

  const payload = {
    contents: payloadContents,
    content_id: payloadContents[0].content_id,
    content_type: "product",
    value: numericValue,
    currency: "ILS",
    ...(orderNumber ? { order_id: String(orderNumber) } : {}),
  };

  ttq("CompletePayment", payload);
  ttq("Purchase", payload);
}

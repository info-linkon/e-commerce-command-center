// TikTok Pixel helper — mirrors src/lib/meta-pixel.ts
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

export function ttqPageView() {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.page();
  } catch (err) {
    console.debug("[tiktok-pixel] page error:", err);
  }
}
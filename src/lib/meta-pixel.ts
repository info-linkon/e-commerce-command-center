// Meta Pixel helper
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export function fbq(event: string, data?: Record<string, any>) {
  if (typeof window !== "undefined" && window.fbq) {
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

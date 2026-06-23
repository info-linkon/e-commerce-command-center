// Google Analytics 4 (GA4) helper
// Tag loaded in index.html with send_page_view:false — we drive page_view + ecommerce events manually.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const GA_MEASUREMENT_ID = "G-M0ST7YDS0C";

type Params = Record<string, any>;

export function gaEvent(name: string, params?: Params): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params || {});
}

export function gaPageView(path: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: document.title,
    send_to: GA_MEASUREMENT_ID,
  });
}

// ───────────────────── E-commerce helpers (GA4 schema) ─────────────────────

export type GAItem = {
  item_id: string;            // SKU / product_number
  item_name?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export function gaViewItem(value: number, items: GAItem[]): void {
  gaEvent("view_item", { currency: "ILS", value, items });
}

export function gaViewItemList(listName: string, items: GAItem[]): void {
  gaEvent("view_item_list", { item_list_name: listName, items });
}

export function gaSearch(searchTerm: string): void {
  gaEvent("search", { search_term: searchTerm });
}

export function gaAddToCart(value: number, items: GAItem[]): void {
  gaEvent("add_to_cart", { currency: "ILS", value, items });
}

export function gaRemoveFromCart(value: number, items: GAItem[]): void {
  gaEvent("remove_from_cart", { currency: "ILS", value, items });
}

export function gaBeginCheckout(value: number, items: GAItem[]): void {
  gaEvent("begin_checkout", { currency: "ILS", value, items });
}

export function gaPurchase(transactionId: string, value: number, items: GAItem[], extra?: Params): void {
  gaEvent("purchase", {
    transaction_id: transactionId,
    currency: "ILS",
    value,
    items,
    ...(extra || {}),
  });
}
// CSV of POS (קופה) sales for Meta "offline events" upload (Events Manager ›
// Data sources › Offline › Upload events). Meta hashes the identifiers on
// upload, so phone/name are sent in plain text, normalized.

import { normalizePhone } from "@/lib/meta-pixel";
import { isTestOrderName } from "@/lib/attribution";

export type OfflineOrderRow = {
  order_number: number;
  created_at: string;
  total: number | string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_city: string | null;
};

const EXCLUDED_STATUSES = new Set(["cancelled", "unfulfilled", "external_unfulfilled"]);
const HEADERS = ["phone", "email", "fn", "ln", "ct", "country", "event_name", "event_time", "value", "currency", "order_id"];

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildMetaOfflineCsv(orders: OfflineOrderRow[]): { csv: string; count: number } {
  const rows = orders.filter((o) =>
    !EXCLUDED_STATUSES.has(o.status) &&
    Number(o.total) > 0 &&
    !isTestOrderName(o.customer_name) &&
    (o.customer_phone || o.customer_email),
  );
  const lines = rows.map((o) => {
    const [fn = "", ...rest] = String(o.customer_name || "").trim().split(/\s+/);
    const city = o.shipping_city && o.shipping_city !== "איסוף עצמי" ? o.shipping_city : "";
    return [
      normalizePhone(o.customer_phone),
      String(o.customer_email || "").trim().toLowerCase(),
      fn,
      rest.join(" "),
      city,
      "IL",
      "Purchase",
      Math.floor(new Date(o.created_at).getTime() / 1000),
      Number(o.total).toFixed(2),
      "ILS",
      `pos-${o.order_number}`,
    ].map(csvCell).join(",");
  });
  return { csv: [HEADERS.join(","), ...lines].join("\n"), count: rows.length };
}

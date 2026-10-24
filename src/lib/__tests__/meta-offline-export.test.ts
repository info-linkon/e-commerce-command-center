import { describe, expect, it } from "vitest";
import { buildMetaOfflineCsv, type OfflineOrderRow } from "@/lib/meta-offline-export";

const base: OfflineOrderRow = {
  order_number: 669,
  created_at: "2026-10-01T10:00:00Z",
  total: 120,
  status: "completed",
  customer_name: "Ahmad Saleh Ali",
  customer_phone: "052-123-4567",
  customer_email: null,
  shipping_city: "איסוף עצמי",
};

describe("buildMetaOfflineCsv", () => {
  it("formats a POS sale for Meta offline upload", () => {
    const { csv, count } = buildMetaOfflineCsv([base]);
    expect(count).toBe(1);
    expect(csv.split("\n")[1]).toBe("972521234567,,Ahmad,Saleh Ali,,IL,Purchase,1790848800,120.00,ILS,pos-669");
  });

  it("skips cancelled, test, zero-value and anonymous orders", () => {
    const { count } = buildMetaOfflineCsv([
      { ...base, status: "cancelled" },
      { ...base, customer_name: "mhmd tst" },
      { ...base, total: 0 },
      { ...base, customer_phone: null },
    ]);
    expect(count).toBe(0);
  });
});

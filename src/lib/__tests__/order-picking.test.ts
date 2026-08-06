import { describe, it, expect } from "vitest";
import { buildPickingRows } from "../order-picking";

describe("buildPickingRows", () => {
  it("creates one row per unit", () => {
    const rows = buildPickingRows({ orderId: "o", orderItemId: "i", variationId: "v", units: 3 });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.quantity === 1)).toBe(true);
  });

  it("handles single unit and invalid values", () => {
    expect(buildPickingRows({ orderId: "o", orderItemId: "i", variationId: "v", units: 1 })).toHaveLength(1);
    expect(buildPickingRows({ orderId: "o", orderItemId: "i", variationId: "v", units: 0 })).toHaveLength(0);
  });
});
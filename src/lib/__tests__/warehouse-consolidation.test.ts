import { describe, expect, it } from "vitest";
import { planConsolidation } from "@/lib/warehouse-consolidation";

describe("planConsolidation", () => {
  it("moves every non-zero row into the target and sums per variation", () => {
    const plan = planConsolidation(
      [
        { variation_id: "v1", warehouse_id: "main", quantity: 5 },
        { variation_id: "v1", warehouse_id: "tarek", quantity: 3 },
        { variation_id: "v1", warehouse_id: "karem", quantity: -2 },
        { variation_id: "v2", warehouse_id: "tarek", quantity: 0 },
        { variation_id: "v3", warehouse_id: "karem", quantity: -4 },
        { variation_id: "v3", warehouse_id: "main", quantity: 1 },
      ],
      "main",
    );
    expect(plan.finalQuantities.get("v1")).toBe(6);
    expect(plan.finalQuantities.get("v2")).toBe(0);
    expect(plan.finalQuantities.get("v3")).toBe(-3);
    expect(plan.moves.get("tarek")).toEqual([{ variation_id: "v1", quantity: 3 }]);
    expect(plan.moves.get("karem")).toEqual([
      { variation_id: "v1", quantity: -2 },
      { variation_id: "v3", quantity: -4 },
    ]);
    expect(plan.moves.has("main")).toBe(false);
    expect(plan.negativeRowsBefore).toBe(2);
    expect(plan.negativeAfter).toBe(1);
    expect(plan.unitsMoved).toBe(9);
  });
});

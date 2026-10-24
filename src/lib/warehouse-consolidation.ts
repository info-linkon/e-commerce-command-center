// Plan for merging every warehouse's stock into one main warehouse
// (client notes §7.3: stock was split across several warehouses and
// 76 rows had gone negative).

export type InventoryRow = { variation_id: string; warehouse_id: string; quantity: number };

export type ConsolidationPlan = {
  /** Per source warehouse: quantities to move into the target (may be negative). */
  moves: Map<string, { variation_id: string; quantity: number }[]>;
  /** Target quantity per variation after the merge. */
  finalQuantities: Map<string, number>;
  negativeRowsBefore: number;
  /** Variations still below zero after the merge (combined stock is negative). */
  negativeAfter: number;
  unitsMoved: number;
};

export function planConsolidation(rows: InventoryRow[], targetId: string): ConsolidationPlan {
  const moves = new Map<string, { variation_id: string; quantity: number }[]>();
  const finalQuantities = new Map<string, number>();
  let negativeRowsBefore = 0;
  let unitsMoved = 0;
  for (const r of rows) {
    const qty = Number(r.quantity) || 0;
    if (qty < 0) negativeRowsBefore++;
    finalQuantities.set(r.variation_id, (finalQuantities.get(r.variation_id) || 0) + qty);
    if (r.warehouse_id === targetId || qty === 0) continue;
    const list = moves.get(r.warehouse_id) || [];
    list.push({ variation_id: r.variation_id, quantity: qty });
    moves.set(r.warehouse_id, list);
    unitsMoved += Math.abs(qty);
  }
  let negativeAfter = 0;
  for (const q of finalQuantities.values()) if (q < 0) negativeAfter++;
  return { moves, finalQuantities, negativeRowsBefore, negativeAfter, unitsMoved };
}

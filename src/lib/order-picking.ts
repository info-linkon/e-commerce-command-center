export interface PickingRow {
  order_id: string;
  order_item_id: string;
  variation_id: string;
  quantity: 1;
}

/**
 * Build picking rows for a single variation — always ONE row per physical unit.
 * Used both for regular order lines and for expanded bundle components.
 */
export function buildPickingRows(params: {
  orderId: string;
  orderItemId: string;
  variationId: string;
  units: number;
}): PickingRow[] {
  const units = Math.max(0, Math.floor(Number(params.units) || 0));
  return Array.from({ length: units }, () => ({
    order_id: params.orderId,
    order_item_id: params.orderItemId,
    variation_id: params.variationId,
    quantity: 1 as const,
  }));
}

import { supabase } from "@/integrations/supabase/client";

export interface OrderItemForExpansion {
  variation_id?: string | null;
  quantity: number;
  product_variations?: { product_id?: string } | null;
}

export interface ExpandedInventoryRow {
  variation_id: string;
  quantity: number;
}

/**
 * Expand order_items into actual inventory-affecting rows.
 * - Regular variations stay as-is.
 * - Bundles (simple_bundle / variable_bundle) are expanded into their component variations.
 * - Quantities of bundle components are multiplied by the order_item quantity.
 * - Custom (no variation_id) lines are skipped.
 * - Multiple lines pointing to the same variation are merged.
 */
export async function expandToInventoryRows(
  items: OrderItemForExpansion[]
): Promise<ExpandedInventoryRow[]> {
  const merged = new Map<string, number>();

  const add = (variationId: string, qty: number) => {
    if (!variationId || qty === 0) return;
    merged.set(variationId, (merged.get(variationId) || 0) + qty);
  };

  for (const item of items) {
    if (!item.variation_id) continue;
    const productId = item.product_variations?.product_id;

    let bundle: { id: string; bundle_type: string } | null = null;
    if (productId) {
      const { data } = await supabase
        .from("bundles")
        .select("id, bundle_type")
        .eq("product_id", productId)
        .maybeSingle();
      bundle = data as any;
    }

    if (!bundle) {
      // Regular variation — affects inventory directly
      add(item.variation_id, item.quantity);
      continue;
    }

    // Expand bundle to components
    let components: Array<{ variation_id: string; quantity: number }> = [];

    if (bundle.bundle_type === "variable_bundle") {
      const { data: bvs } = await supabase
        .from("bundle_variations")
        .select("id")
        .eq("bundle_id", bundle.id)
        .limit(1);

      if (bvs && bvs.length > 0) {
        const { data: bvItems } = await supabase
          .from("bundle_variation_items")
          .select("variation_id, quantity")
          .eq("bundle_variation_id", bvs[0].id);
        components = bvItems || [];
      }
    } else {
      const { data: biItems } = await supabase
        .from("bundle_items")
        .select("variation_id, quantity")
        .eq("bundle_id", bundle.id);
      components = biItems || [];
    }

    for (const c of components) {
      add(c.variation_id, c.quantity * item.quantity);
    }
  }

  return Array.from(merged.entries()).map(([variation_id, quantity]) => ({
    variation_id,
    quantity,
  }));
}
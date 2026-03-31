import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StockResult {
  inStock: boolean;
  maxQuantity: number;
}

/**
 * For simple bundles: returns { inStock, maxQuantity } based on bundle_items components.
 * For variable bundles: returns a Map<bundleVariationId, { inStock, maxQuantity }> based on bundle_variation_items.
 */
export function useBundleStock(bundleId: string | undefined, bundleType: string | undefined) {
  return useQuery({
    queryKey: ["bundle-stock", bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      if (!bundleId) return null;

      if (bundleType === "simple_bundle") {
        // Get bundle items (components)
        const { data: items, error } = await supabase
          .from("bundle_items")
          .select("variation_id, quantity")
          .eq("bundle_id", bundleId);
        if (error) throw error;
        if (!items || items.length === 0) return { simple: { inStock: false, maxQuantity: 0 } as StockResult };

        // Get aggregated inventory for each variation
        const varIds = [...new Set(items.map(i => i.variation_id))];
        const { data: inv } = await supabase
          .from("inventory")
          .select("variation_id, quantity")
          .in("variation_id", varIds);

        const stockMap = new Map<string, number>();
        for (const row of inv || []) {
          stockMap.set(row.variation_id, (stockMap.get(row.variation_id) || 0) + row.quantity);
        }

        const maxQty = Math.min(
          ...items.map(item => Math.floor((stockMap.get(item.variation_id) || 0) / item.quantity))
        );

        return { simple: { inStock: maxQty > 0, maxQuantity: Math.max(0, maxQty) } as StockResult };
      }

      // Variable bundle
      const { data: bundleVars } = await supabase
        .from("bundle_variations")
        .select("id")
        .eq("bundle_id", bundleId);

      if (!bundleVars || bundleVars.length === 0) return { variations: new Map<string, StockResult>() };

      const bvIds = bundleVars.map(bv => bv.id);
      const { data: bvItems } = await supabase
        .from("bundle_variation_items")
        .select("bundle_variation_id, variation_id, quantity")
        .in("bundle_variation_id", bvIds);

      if (!bvItems || bvItems.length === 0) {
        const m = new Map<string, StockResult>();
        bvIds.forEach(id => m.set(id, { inStock: false, maxQuantity: 0 }));
        return { variations: m };
      }

      // Get all needed variation stocks
      const allVarIds = [...new Set(bvItems.map(i => i.variation_id))];
      const { data: inv } = await supabase
        .from("inventory")
        .select("variation_id, quantity")
        .in("variation_id", allVarIds);

      const stockMap = new Map<string, number>();
      for (const row of inv || []) {
        stockMap.set(row.variation_id, (stockMap.get(row.variation_id) || 0) + row.quantity);
      }

      const resultMap = new Map<string, StockResult>();
      for (const bvId of bvIds) {
        const components = bvItems.filter(i => i.bundle_variation_id === bvId);
        if (components.length === 0) {
          resultMap.set(bvId, { inStock: false, maxQuantity: 0 });
          continue;
        }
        const maxQty = Math.min(
          ...components.map(c => Math.floor((stockMap.get(c.variation_id) || 0) / c.quantity))
        );
        resultMap.set(bvId, { inStock: maxQty > 0, maxQuantity: Math.max(0, maxQty) });
      }

      return { variations: resultMap };
    },
  });
}

/**
 * Batch version: check stock for multiple bundles at once (for POS/listing pages).
 * Returns Map<bundleId, StockResult> for simple bundles,
 * and Map<bundleId, Map<bundleVariationId, StockResult>> for variable bundles.
 */
export function useBundlesStockBatch(bundleIds: string[]) {
  return useQuery({
    queryKey: ["bundles-stock-batch", bundleIds.sort().join(",")],
    enabled: bundleIds.length > 0,
    queryFn: async () => {
      if (bundleIds.length === 0) return { simpleStock: new Map<string, StockResult>(), variableStock: new Map<string, Map<string, StockResult>>() };

      // Get all bundles info
      const { data: bundles } = await supabase
        .from("bundles")
        .select("id, bundle_type, product_id")
        .in("id", bundleIds);

      if (!bundles) return { simpleStock: new Map<string, StockResult>(), variableStock: new Map<string, Map<string, StockResult>>() };

      const simpleBundleIds = bundles.filter(b => b.bundle_type === "simple_bundle").map(b => b.id);
      const variableBundleIds = bundles.filter(b => b.bundle_type === "variable_bundle").map(b => b.id);

      // --- Simple bundles ---
      let simpleItems: any[] = [];
      if (simpleBundleIds.length > 0) {
        const { data } = await supabase
          .from("bundle_items")
          .select("bundle_id, variation_id, quantity")
          .in("bundle_id", simpleBundleIds);
        simpleItems = data || [];
      }

      // --- Variable bundles ---
      let bvList: any[] = [];
      let bvItems: any[] = [];
      if (variableBundleIds.length > 0) {
        const { data: bvs } = await supabase
          .from("bundle_variations")
          .select("id, bundle_id")
          .in("bundle_id", variableBundleIds);
        bvList = bvs || [];

        if (bvList.length > 0) {
          const { data } = await supabase
            .from("bundle_variation_items")
            .select("bundle_variation_id, variation_id, quantity")
            .in("bundle_variation_id", bvList.map(bv => bv.id));
          bvItems = data || [];
        }
      }

      // Collect all variation IDs we need stock for
      const allVarIds = new Set<string>();
      simpleItems.forEach(i => allVarIds.add(i.variation_id));
      bvItems.forEach(i => allVarIds.add(i.variation_id));

      // Fetch inventory
      const stockMap = new Map<string, number>();
      if (allVarIds.size > 0) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("variation_id, quantity")
          .in("variation_id", [...allVarIds]);
        for (const row of inv || []) {
          stockMap.set(row.variation_id, (stockMap.get(row.variation_id) || 0) + row.quantity);
        }
      }

      // Calculate simple bundle stock
      const simpleStock = new Map<string, StockResult>();
      for (const bid of simpleBundleIds) {
        const components = simpleItems.filter(i => i.bundle_id === bid);
        if (components.length === 0) {
          simpleStock.set(bid, { inStock: false, maxQuantity: 0 });
          continue;
        }
        const maxQty = Math.min(...components.map(c => Math.floor((stockMap.get(c.variation_id) || 0) / c.quantity)));
        simpleStock.set(bid, { inStock: maxQty > 0, maxQuantity: Math.max(0, maxQty) });
      }

      // Calculate variable bundle stock
      const variableStock = new Map<string, Map<string, StockResult>>();
      for (const bid of variableBundleIds) {
        const bundleVariations = bvList.filter(bv => bv.bundle_id === bid);
        const varMap = new Map<string, StockResult>();
        for (const bv of bundleVariations) {
          const components = bvItems.filter(i => i.bundle_variation_id === bv.id);
          if (components.length === 0) {
            varMap.set(bv.id, { inStock: false, maxQuantity: 0 });
            continue;
          }
          const maxQty = Math.min(...components.map(c => Math.floor((stockMap.get(c.variation_id) || 0) / c.quantity)));
          varMap.set(bv.id, { inStock: maxQty > 0, maxQuantity: Math.max(0, maxQty) });
        }
        variableStock.set(bid, varMap);
      }

      return { simpleStock, variableStock, bundleProductMap: new Map(bundles.map(b => [b.product_id, b])) };
    },
  });
}

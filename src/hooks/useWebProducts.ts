import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Annotate a list of products with `outOfStock`.
// IMPORTANT: bundles have a virtual "ברירת מחדל" variation whose
// inventory.quantity is always 0 — the real availability is derived from the
// component variations (bundle_items / bundle_variation_items). Summing
// inventory directly would mark every bundle as out-of-stock.
// We therefore split products into (a) regular products, summed via inventory,
// and (b) bundles, computed from component stock like useBundlesStockBatch.
async function annotateOutOfStock<T extends { id: string }>(products: T[]): Promise<(T & { outOfStock: boolean })[]> {
  if (!products || products.length === 0) return [] as any;
  const productIds = products.map((p) => p.id);

  // 1. Identify which products are bundles.
  const { data: bundleRows } = await supabase
    .from("bundles")
    .select("id, product_id, bundle_type")
    .in("product_id", productIds);
  const bundleByProduct = new Map<string, { id: string; bundle_type: string }>();
  for (const b of bundleRows || []) {
    bundleByProduct.set((b as any).product_id, { id: (b as any).id, bundle_type: (b as any).bundle_type });
  }

  const regularProductIds = productIds.filter((pid) => !bundleByProduct.has(pid));

  // 2. Regular products: sum inventory across their variations.
  const stockByProduct = new Map<string, number>();
  if (regularProductIds.length > 0) {
    const { data: variations } = await supabase
      .from("product_variations")
      .select("id, product_id")
      .in("product_id", regularProductIds);
    const variationIds = (variations || []).map((v: any) => v.id);
    const stockByVariation = new Map<string, number>();
    if (variationIds.length > 0) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("variation_id, quantity")
        .in("variation_id", variationIds);
      for (const row of inv || []) {
        const k = (row as any).variation_id as string;
        stockByVariation.set(k, (stockByVariation.get(k) || 0) + Number((row as any).quantity || 0));
      }
    }
    for (const v of variations || []) {
      const pid = (v as any).product_id as string;
      const qty = stockByVariation.get((v as any).id) || 0;
      stockByProduct.set(pid, (stockByProduct.get(pid) || 0) + qty);
    }
  }

  // 3. Bundles: compute availability from component stock.
  const bundleOutOfStock = new Map<string, boolean>();
  if (bundleByProduct.size > 0) {
    const simpleBundleIds: string[] = [];
    const variableBundleIds: string[] = [];
    const productByBundleId = new Map<string, string>();
    for (const [pid, b] of bundleByProduct.entries()) {
      productByBundleId.set(b.id, pid);
      if (b.bundle_type === "variable_bundle") variableBundleIds.push(b.id);
      else simpleBundleIds.push(b.id);
    }

    // Load components in parallel.
    const [simpleItemsRes, bvListRes] = await Promise.all([
      simpleBundleIds.length
        ? supabase.from("bundle_items").select("bundle_id, variation_id, quantity").in("bundle_id", simpleBundleIds)
        : Promise.resolve({ data: [] as any[] } as any),
      variableBundleIds.length
        ? supabase.from("bundle_variations").select("id, bundle_id").in("bundle_id", variableBundleIds)
        : Promise.resolve({ data: [] as any[] } as any),
    ]);
    const simpleItems = (simpleItemsRes.data || []) as any[];
    const bvList = (bvListRes.data || []) as any[];

    let bvItems: any[] = [];
    if (bvList.length > 0) {
      const { data } = await supabase
        .from("bundle_variation_items")
        .select("bundle_variation_id, variation_id, quantity")
        .in("bundle_variation_id", bvList.map((bv) => bv.id));
      bvItems = data || [];
    }

    // Collect all component variation ids and fetch their inventory in one query.
    const componentVarIds = new Set<string>();
    simpleItems.forEach((i) => componentVarIds.add(i.variation_id));
    bvItems.forEach((i) => componentVarIds.add(i.variation_id));
    const componentStock = new Map<string, number>();
    if (componentVarIds.size > 0) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("variation_id, quantity")
        .in("variation_id", [...componentVarIds]);
      for (const row of inv || []) {
        const k = (row as any).variation_id as string;
        componentStock.set(k, (componentStock.get(k) || 0) + Number((row as any).quantity || 0));
      }
    }

    // Simple bundles: maxQty = min(floor(stock(component) / qty)).
    for (const bid of simpleBundleIds) {
      const components = simpleItems.filter((i) => i.bundle_id === bid);
      const pid = productByBundleId.get(bid)!;
      if (components.length === 0) {
        bundleOutOfStock.set(pid, true);
        continue;
      }
      const maxQty = Math.min(
        ...components.map((c) => Math.floor((componentStock.get(c.variation_id) || 0) / (c.quantity || 1))),
      );
      bundleOutOfStock.set(pid, maxQty <= 0);
    }

    // Variable bundles: in stock if at least one variation is in stock.
    for (const bid of variableBundleIds) {
      const pid = productByBundleId.get(bid)!;
      const bvs = bvList.filter((bv) => bv.bundle_id === bid);
      if (bvs.length === 0) {
        bundleOutOfStock.set(pid, true);
        continue;
      }
      let anyAvailable = false;
      for (const bv of bvs) {
        const components = bvItems.filter((i) => i.bundle_variation_id === bv.id);
        if (components.length === 0) continue;
        const maxQty = Math.min(
          ...components.map((c) => Math.floor((componentStock.get(c.variation_id) || 0) / (c.quantity || 1))),
        );
        if (maxQty > 0) {
          anyAvailable = true;
          break;
        }
      }
      bundleOutOfStock.set(pid, !anyAvailable);
    }
  }

  return products.map((p) => {
    const isBundle = bundleByProduct.has(p.id);
    const outOfStock = isBundle
      ? bundleOutOfStock.get(p.id) ?? true
      : (stockByProduct.get(p.id) || 0) <= 0;
    return { ...p, outOfStock };
  });
}

export function useWebProducts(categoryId?: string) {
  return useQuery({
    queryKey: ["web-products", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name, name_he, slug)")
        .eq("is_published", true)
        .order("name");
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return await annotateOutOfStock(data as any[]);
    },
  });
}

export function useWebProductsByCategoryNumber(categoryNumber: number | undefined) {
  return useQuery({
    queryKey: ["web-products-by-cat-num", categoryNumber],
    enabled: !!categoryNumber,
    queryFn: async () => {
      // First find category by number
      const { data: cat } = await (supabase
        .from("categories")
        .select("id, name, name_he") as any)
        .eq("category_number", categoryNumber!)
        .single();
      if (!cat) return { products: [], category: null };

      // Collect product ids from both the primary category_id link
      // and the many-to-many product_categories table.
      const [primaryRes, mappedRes] = await Promise.all([
        supabase.from("products").select("id").eq("category_id", cat.id),
        supabase.from("product_categories").select("product_id").eq("category_id", cat.id),
      ]);
      if (primaryRes.error) throw primaryRes.error;
      if (mappedRes.error) throw mappedRes.error;

      const ids = Array.from(
        new Set([
          ...(primaryRes.data || []).map((r: any) => r.id),
          ...(mappedRes.data || []).map((r: any) => r.product_id),
        ]),
      );
      if (ids.length === 0) return { products: [], category: cat };

      const { data, error } = await supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name, name_he, slug)")
        .eq("is_published", true)
        .in("id", ids)
        .order("name");
      if (error) throw error;
      return { products: await annotateOutOfStock((data || []) as any[]), category: cat };
    },
  });
}

export function useWebProduct(productNumber: string | undefined) {
  return useQuery({
    queryKey: ["web-product", productNumber],
    enabled: !!productNumber,
    queryFn: async () => {
      const num = parseInt(productNumber!, 10);
      if (isNaN(num)) return null;
      const { data, error } = await (supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name, name_he, slug)") as any)
        .eq("product_number", num)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useWebProductVariations(productId: string | undefined) {
  return useQuery({
    queryKey: ["web-product-variations", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useWebCategories() {
  return useQuery({
    queryKey: ["web-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useWebBundleVariations(bundleId: string | undefined) {
  return useQuery({
    queryKey: ["web-bundle-variations", bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_variations")
        .select("*")
        .eq("bundle_id", bundleId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useWebFeaturedProducts() {
  return useQuery({
    queryKey: ["web-featured-products"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name, name_he, slug)") as any)
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("name")
        .limit(12);
      if (error) throw error;
      return await annotateOutOfStock((data || []) as any[]);
    },
  });
}

export function useWebBestSellers() {
  return useQuery({
    queryKey: ["web-best-sellers"],
    queryFn: async () => {
      // order_items is locked down for anon (PII via the order join), so the
      // aggregation runs server-side in `web-best-sellers` (service role).
      const { data, error } = await supabase.functions.invoke("web-best-sellers", { body: {} });
      if (error) throw error;
      return (data?.products || []) as any[];
    },
  });
}

export function useWebSearch(query: string) {
  return useQuery({
    queryKey: ["web-search", query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories!products_category_id_fkey(name, name_he, slug)")
        .eq("is_published", true)
        .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      return await annotateOutOfStock((data || []) as any[]);
    },
  });
}

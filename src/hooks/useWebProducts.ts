import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Annotate a list of products with `outOfStock` based on the sum of
// inventory.quantity across all their variations. Bundles are evaluated by
// summing the inventory of their default variation (the auto-created
// "ברירת מחדל"); this matches what AddToCart actually decrements.
async function annotateOutOfStock<T extends { id: string }>(products: T[]): Promise<(T & { outOfStock: boolean })[]> {
  if (!products || products.length === 0) return [] as any;
  const productIds = products.map((p) => p.id);
  const { data: variations } = await supabase
    .from("product_variations")
    .select("id, product_id")
    .in("product_id", productIds);
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
  const stockByProduct = new Map<string, number>();
  for (const v of variations || []) {
    const pid = (v as any).product_id as string;
    const qty = stockByVariation.get((v as any).id) || 0;
    stockByProduct.set(pid, (stockByProduct.get(pid) || 0) + qty);
  }
  return products.map((p) => ({ ...p, outOfStock: (stockByProduct.get(p.id) || 0) <= 0 }));
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

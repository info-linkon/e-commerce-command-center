import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWebProducts(categoryId?: string) {
  return useQuery({
    queryKey: ["web-products", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("is_published", true)
        .order("name");
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("is_published", true)
        .eq("category_id", cat.id)
        .order("name");
      if (error) throw error;
      return { products: data || [], category: cat };
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
        .select("*, categories(name, slug)") as any)
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
        .select("*, categories(name, slug)") as any)
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("name")
        .limit(12);
      if (error) throw error;
      return data;
    },
  });
}

export function useWebBestSellers() {
  return useQuery({
    queryKey: ["web-best-sellers"],
    queryFn: async () => {
      // Get order_items grouped by variation, then map to products
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select("variation_id, quantity");
      if (error) throw error;

      // Sum quantities per variation_id
      const variationTotals: Record<string, number> = {};
      for (const item of orderItems || []) {
        if (item.variation_id) {
          variationTotals[item.variation_id] = (variationTotals[item.variation_id] || 0) + item.quantity;
        }
      }

      // Get variation -> product mapping
      const varIds = Object.keys(variationTotals);
      if (varIds.length === 0) return [];

      const { data: variations } = await supabase
        .from("product_variations")
        .select("id, product_id")
        .in("id", varIds);

      // Sum by product_id
      const productTotals: Record<string, number> = {};
      for (const v of variations || []) {
        productTotals[v.product_id] = (productTotals[v.product_id] || 0) + (variationTotals[v.id] || 0);
      }

      // Get top 12 product IDs
      const topProductIds = Object.entries(productTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([id]) => id);

      if (topProductIds.length === 0) return [];

      const { data: products } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("is_published", true)
        .in("id", topProductIds);

      // Sort by sales
      return (products || []).sort((a, b) => (productTotals[b.id] || 0) - (productTotals[a.id] || 0));
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
        .select("*, categories(name, slug)")
        .eq("is_published", true)
        .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

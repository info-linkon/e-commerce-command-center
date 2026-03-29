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

export function useWebProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["web-product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("id", id!)
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

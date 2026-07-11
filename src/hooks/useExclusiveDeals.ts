import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PUBLIC_KEY = ["exclusive-deals-public"];
const ADMIN_KEY = ["exclusive-deals-admin"];

// Same annotate logic as useWebProducts but scoped locally to avoid coupling.
async function annotateOutOfStock<T extends { id: string }>(products: T[]): Promise<(T & { outOfStock: boolean })[]> {
  if (!products || products.length === 0) return [] as any;
  const productIds = products.map((p) => p.id);

  const { data: bundleRows } = await supabase
    .from("bundles")
    .select("id, product_id, bundle_type")
    .in("product_id", productIds);
  const bundleByProduct = new Map<string, { id: string; bundle_type: string }>();
  for (const b of bundleRows || []) {
    bundleByProduct.set((b as any).product_id, { id: (b as any).id, bundle_type: (b as any).bundle_type });
  }
  const regularProductIds = productIds.filter((pid) => !bundleByProduct.has(pid));
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
      stockByProduct.set(pid, (stockByProduct.get(pid) || 0) + (stockByVariation.get((v as any).id) || 0));
    }
  }
  return products.map((p) => ({
    ...p,
    outOfStock: bundleByProduct.has(p.id) ? false : (stockByProduct.get(p.id) || 0) <= 0,
  }));
}

export function useExclusiveDealsPublic() {
  return useQuery({
    queryKey: PUBLIC_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exclusive_deals")
        .select("id, product_id, sort_order, products!inner(*, categories!products_category_id_fkey(name, name_he, slug))")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      const products = (data || [])
        .map((row: any) => row.products)
        .filter((p: any) => p);
      return await annotateOutOfStock(products);
    },
  });
}

export function useExclusiveDealsAdmin() {
  return useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exclusive_deals")
        .select("id, product_id, sort_order, active, products!inner(id, name, name_ar, sale_price, image_url, product_number)")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddExclusiveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product_id: string) => {
      const { data: max } = await supabase
        .from("exclusive_deals")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((max as any)?.[0]?.sort_order ?? -1) + 1;
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("exclusive_deals").insert({
        product_id,
        sort_order: nextOrder,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("המוצר נוסף למבצעים");
    },
    onError: (e: any) => {
      if (e?.code === "23505") toast.error("המוצר כבר קיים ברשימה");
      else toast.error("שגיאה בהוספה");
    },
  });
}

export function useRemoveExclusiveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exclusive_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
      toast.success("הוסר מהמבצעים");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });
}

export function useToggleExclusiveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("exclusive_deals").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
    },
  });
}

export function useReorderExclusiveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map((u) => supabase.from("exclusive_deals").update({ sort_order: u.sort_order }).eq("id", u.id)),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_KEY });
      qc.invalidateQueries({ queryKey: PUBLIC_KEY });
    },
  });
}
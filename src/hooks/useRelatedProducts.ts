import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Admin: full related list with sortable order + product info for the picker UI.
export function useRelatedProductsAdmin(productId: string | undefined) {
  return useQuery({
    queryKey: ["related-products-admin", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_products")
        .select("id, related_product_id, sort_order, products:related_product_id(id, name, name_ar, sale_price, image_url, sku, is_published)")
        .eq("product_id", productId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

// Public: only published related products, with categories for the storefront card.
export function useRelatedProductsPublic(productId: string | undefined) {
  return useQuery({
    queryKey: ["related-products-public", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_products")
        .select("sort_order, products:related_product_id!inner(*, categories!products_category_id_fkey(name, name_he, slug))")
        .eq("product_id", productId!)
        .order("sort_order");
      if (error) throw error;
      return (data || [])
        .map((row: any) => row.products)
        .filter((p: any) => p && p.is_published);
    },
  });
}

export function useAddRelatedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, relatedId }: { productId: string; relatedId: string }) => {
      if (productId === relatedId) throw new Error("לא ניתן לקשר מוצר לעצמו");
      const { data: max } = await supabase
        .from("related_products")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = ((max as any)?.[0]?.sort_order ?? -1) + 1;
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("related_products").insert({
        product_id: productId,
        related_product_id: relatedId,
        sort_order: nextOrder,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["related-products-admin", vars.productId] });
      qc.invalidateQueries({ queryKey: ["related-products-public", vars.productId] });
      toast.success("המוצר נוסף לקשורים");
    },
    onError: (e: any) => {
      if (e?.code === "23505") toast.error("המוצר כבר קיים ברשימה");
      else toast.error(e?.message || "שגיאה בהוספה");
    },
  });
}

export function useRemoveRelatedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId: _pid }: { id: string; productId: string }) => {
      const { error } = await supabase.from("related_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["related-products-admin", vars.productId] });
      qc.invalidateQueries({ queryKey: ["related-products-public", vars.productId] });
      toast.success("הוסר מהקשורים");
    },
    onError: () => toast.error("שגיאה במחיקה"),
  });
}

export function useReorderRelatedProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId: _pid, updates }: { productId: string; updates: { id: string; sort_order: number }[] }) => {
      await Promise.all(
        updates.map((u) => supabase.from("related_products").update({ sort_order: u.sort_order }).eq("id", u.id)),
      );
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["related-products-admin", vars.productId] });
      qc.invalidateQueries({ queryKey: ["related-products-public", vars.productId] });
    },
  });
}
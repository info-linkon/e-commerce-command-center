import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { syncProductToWoo } from "@/lib/wooProductSync";

type Product = Tables<"products">;
type ProductVariation = Tables<"product_variations">;

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: ["products", categoryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useProductVariations(productId: string | undefined) {
  return useQuery({
    queryKey: ["product_variations", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", productId!)
        .order("name");
      if (error) throw error;
      return data as ProductVariation[];
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: TablesInsert<"products">) => {
      const { data, error } = await supabase.from("products").insert(product).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המוצר נוצר בהצלחה");
      if (data.is_published) {
        syncProductToWoo(data.id);
      }
    },
    onError: (err) => { console.error("Create product error:", err); toast.error("שגיאה ביצירת מוצר"); },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"products"> & { id: string }) => {
      const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המוצר עודכן בהצלחה");
      if (data.is_published) {
        syncProductToWoo(data.id);
      }
    },
    onError: () => toast.error("שגיאה בעדכון מוצר"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המוצר נמחק בהצלחה");
    },
    onError: () => toast.error("שגיאה במחיקת מוצר"),
  });
}

export function useCreateVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variation: TablesInsert<"product_variations">) => {
      const { data, error } = await supabase.from("product_variations").insert(variation).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["product_variations", variables.product_id] });
      toast.success("הוריאציה נוצרה בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת וריאציה"),
  });
}

export function useUpdateVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"product_variations"> & { id: string }) => {
      const { data, error } = await supabase.from("product_variations").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["product_variations", data.product_id] });
      toast.success("הוריאציה עודכנה בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון וריאציה"),
  });
}

export function useDeleteVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_variations").delete().eq("id", id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      qc.invalidateQueries({ queryKey: ["product_variations", productId] });
      toast.success("הוריאציה נמחקה בהצלחה");
    },
    onError: () => toast.error("שגיאה במחיקת וריאציה"),
  });
}

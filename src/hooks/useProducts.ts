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
        .select("*, categories!products_category_id_fkey(name), product_categories(category:categories(id, name))")
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
        .select("*, categories!products_category_id_fkey(name)")
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
    onError: (err) => { console.error("Update product error:", err); toast.error("שגיאה בעדכון מוצר"); },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Find bundles linked to this product
      const { data: bundles } = await supabase.from("bundles").select("id").eq("product_id", id);
      const bundleIds = (bundles || []).map(b => b.id);

      if (bundleIds.length > 0) {
        // 2. Delete bundle_variation_items via bundle_variations
        const { data: bvs } = await supabase.from("bundle_variations").select("id").in("bundle_id", bundleIds);
        const bvIds = (bvs || []).map(v => v.id);
        if (bvIds.length > 0) {
          await supabase.from("bundle_variation_items").delete().in("bundle_variation_id", bvIds);
        }
        // 3. Delete bundle_variations
        await supabase.from("bundle_variations").delete().in("bundle_id", bundleIds);
        // 4. Delete bundle_items
        await supabase.from("bundle_items").delete().in("bundle_id", bundleIds);
        // 5. Delete bundles
        await supabase.from("bundles").delete().eq("product_id", id);
      }

      // 6. Clean up references to product variations
      const { data: variations } = await supabase.from("product_variations").select("id").eq("product_id", id);
      const varIds = (variations || []).map(v => v.id);
      if (varIds.length > 0) {
        // Delete inventory records
        await supabase.from("inventory").delete().in("variation_id", varIds);
        // Delete intake_session_items
        await supabase.from("intake_session_items").delete().in("variation_id", varIds);
        // Delete inventory_transfer_items
        await supabase.from("inventory_transfer_items").delete().in("variation_id", varIds);
        // Delete bundle_items referencing these variations (from other bundles)
        await supabase.from("bundle_items").delete().in("variation_id", varIds);
        await supabase.from("bundle_variation_items").delete().in("variation_id", varIds);
        // Delete order_picking_items linked to order_items with these variations
        const { data: orderItems } = await supabase.from("order_items").select("id").in("variation_id", varIds);
        const oiIds = (orderItems || []).map(oi => oi.id);
        if (oiIds.length > 0) {
          await supabase.from("order_picking_items").delete().in("order_item_id", oiIds);
        }
      }

      // 7. Delete product_variations
      await supabase.from("product_variations").delete().eq("product_id", id);

      // 8. Finally delete the product
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המוצר נמחק בהצלחה");
    },
    onError: (err) => { console.error("Delete product error:", err); toast.error("שגיאה במחיקת מוצר"); },
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
      // Pre-flight: check what blocks deletion so we can surface a clear, actionable error.
      const [orderItems, bundleItems, bvi, inv, invLog] = await Promise.all([
        supabase.from("order_items").select("id", { count: "exact", head: true }).eq("variation_id", id),
        supabase.from("bundle_items").select("id", { count: "exact", head: true }).eq("variation_id", id),
        supabase.from("bundle_variation_items").select("id", { count: "exact", head: true }).eq("variation_id", id),
        supabase.from("inventory").select("id", { count: "exact", head: true }).eq("variation_id", id),
        supabase.from("inventory_log").select("id", { count: "exact", head: true }).eq("variation_id", id),
      ]);

      if ((orderItems.count || 0) > 0) {
        throw new Error(`לא ניתן למחוק — הוריאציה מופיעה ב-${orderItems.count} הזמנות. ניתן לבטל הצגתה במקום למחוק.`);
      }
      if ((bundleItems.count || 0) > 0 || (bvi.count || 0) > 0) {
        throw new Error("לא ניתן למחוק — הוריאציה משמשת כרכיב בחבילה. הסר אותה מהחבילה תחילה.");
      }

      // Clean up safe references (inventory rows + log entries) to allow deletion.
      if ((inv.count || 0) > 0) {
        const { error: invErr } = await supabase.from("inventory").delete().eq("variation_id", id);
        if (invErr) throw new Error(`לא ניתן למחוק — שגיאה בניקוי מלאי: ${invErr.message}`);
      }
      if ((invLog.count || 0) > 0) {
        // inventory_log has variation_id nullable — set to null instead of deleting (preserve audit trail)
        const { error: logErr } = await supabase.from("inventory_log").update({ variation_id: null }).eq("variation_id", id);
        if (logErr) throw new Error(`לא ניתן למחוק — שגיאה בעדכון יומן מלאי: ${logErr.message}`);
      }

      const { error } = await supabase.from("product_variations").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return productId;
    },
    onSuccess: (productId) => {
      qc.invalidateQueries({ queryKey: ["product_variations", productId] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("הוריאציה נמחקה בהצלחה");
    },
    onError: (err: Error) => toast.error(err.message || "שגיאה במחיקת וריאציה"),
  });
}

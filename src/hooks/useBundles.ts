import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useBundles() {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("*, products(name, name_ar, image_url, sale_price, cost_price, category_id, sku, is_published, categories(name)), bundle_items(*, product_variations(name, sku))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBundle(id: string | undefined) {
  return useQuery({
    queryKey: ["bundles", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("*, products(name, name_ar, image_url, sale_price, cost_price, category_id, sku, description, description_ar, short_description, short_description_ar, is_published, product_type, gallery_images, categories(name)), bundle_items(*, product_variations(name, sku, price))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productData,
      bundleType,
      items,
    }: {
      productData: TablesInsert<"products">;
      bundleType: "simple_bundle" | "variable_bundle";
      items: { variation_id: string; quantity: number }[];
    }) => {
      const { data: product, error: pErr } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();
      if (pErr) throw pErr;

      const { data: bundle, error: bErr } = await supabase
        .from("bundles")
        .insert({ product_id: product.id, bundle_type: bundleType })
        .select()
        .single();
      if (bErr) throw bErr;

      if (items.length > 0) {
        const { error: iErr } = await supabase
          .from("bundle_items")
          .insert(items.map((item) => ({ ...item, bundle_id: bundle.id })));
        if (iErr) throw iErr;
      }

      return bundle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המארז נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת מארז"),
  });
}

export function useUpdateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bundleId,
      productId,
      productData,
      bundleType,
      items,
    }: {
      bundleId: string;
      productId: string;
      productData: Partial<TablesInsert<"products">>;
      bundleType: "simple_bundle" | "variable_bundle";
      items: { variation_id: string; quantity: number }[];
    }) => {
      // Update product
      const { error: pErr } = await supabase
        .from("products")
        .update(productData)
        .eq("id", productId);
      if (pErr) throw pErr;

      // Update bundle type
      const { error: bErr } = await supabase
        .from("bundles")
        .update({ bundle_type: bundleType })
        .eq("id", bundleId);
      if (bErr) throw bErr;

      // Replace bundle items
      await supabase.from("bundle_items").delete().eq("bundle_id", bundleId);
      if (items.length > 0) {
        const { error: iErr } = await supabase
          .from("bundle_items")
          .insert(items.map((item) => ({ ...item, bundle_id: bundleId })));
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המארז עודכן בהצלחה");
    },
    onError: (err: any) => {
      console.error("Update bundle error:", err, JSON.stringify(err));
      toast.error(`שגיאה בעדכון מארז: ${err?.message || "unknown"}`);
    },
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bundleId, productId }: { bundleId: string; productId: string }) => {
      await supabase.from("bundle_items").delete().eq("bundle_id", bundleId);
      await supabase.from("bundles").delete().eq("id", bundleId);
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המארז נמחק בהצלחה");
    },
    onError: () => toast.error("שגיאה במחיקת מארז"),
  });
}

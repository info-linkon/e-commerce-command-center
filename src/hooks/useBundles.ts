import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useBundles() {
  return useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("*, products(name, image_url), bundle_items(*, product_variations(name, sku))")
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
        .select("*, products(name, image_url, sale_price), bundle_items(*, product_variations(name, sku, price))")
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
      // Create product first
      const { data: product, error: pErr } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();
      if (pErr) throw pErr;

      // Create bundle
      const { data: bundle, error: bErr } = await supabase
        .from("bundles")
        .insert({ product_id: product.id, bundle_type: bundleType })
        .select()
        .single();
      if (bErr) throw bErr;

      // Create bundle items
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

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bundleId, productId }: { bundleId: string; productId: string }) => {
      // Delete bundle items first
      await supabase.from("bundle_items").delete().eq("bundle_id", bundleId);
      // Delete bundle
      await supabase.from("bundles").delete().eq("id", bundleId);
      // Delete associated product
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

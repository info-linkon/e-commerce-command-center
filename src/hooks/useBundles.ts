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

export function useDuplicateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bundleId, productId }: { bundleId: string; productId: string }) => {
      // Fetch source product
      const { data: srcProduct, error: pErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (pErr) throw pErr;

      // Create duplicate product
      const { id, product_number, created_at, updated_at, sku, woo_id, ...productFields } = srcProduct;
      const { data: newProduct, error: npErr } = await supabase
        .from("products")
        .insert({ ...productFields, name: `${productFields.name} (עותק)`, sku: sku ? `${sku}-copy-${Date.now()}` : null, woo_id: null })
        .select()
        .single();
      if (npErr) throw npErr;

      // Fetch source bundle
      const { data: srcBundle, error: bErr } = await supabase
        .from("bundles")
        .select("*")
        .eq("id", bundleId)
        .single();
      if (bErr) throw bErr;

      // Create duplicate bundle
      const { data: newBundle, error: nbErr } = await supabase
        .from("bundles")
        .insert({ product_id: newProduct.id, bundle_type: srcBundle.bundle_type })
        .select()
        .single();
      if (nbErr) throw nbErr;

      // Duplicate bundle_items
      const { data: srcItems } = await supabase
        .from("bundle_items")
        .select("variation_id, quantity")
        .eq("bundle_id", bundleId);
      if (srcItems && srcItems.length > 0) {
        await supabase
          .from("bundle_items")
          .insert(srcItems.map((i) => ({ ...i, bundle_id: newBundle.id })));
      }

      // Duplicate bundle_variations + their items
      const { data: srcVars } = await supabase
        .from("bundle_variations")
        .select("*, bundle_variation_items(variation_id, quantity)")
        .eq("bundle_id", bundleId);
      if (srcVars && srcVars.length > 0) {
        for (const sv of srcVars) {
          const { data: newVar, error: nvErr } = await supabase
            .from("bundle_variations")
            .insert({ bundle_id: newBundle.id, name: sv.name, price: sv.price })
            .select()
            .single();
          if (nvErr) continue;
          const varItems = (sv as any).bundle_variation_items || [];
          if (varItems.length > 0) {
            await supabase
              .from("bundle_variation_items")
              .insert(varItems.map((vi: any) => ({ variation_id: vi.variation_id, quantity: vi.quantity, bundle_variation_id: newVar.id })));
          }
        }
      }

      return newBundle;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bundles"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("המארז שוכפל בהצלחה");
    },
    onError: (err: any) => {
      console.error("Duplicate bundle error:", err, JSON.stringify(err));
      toast.error("שגיאה בשכפול מארז");
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

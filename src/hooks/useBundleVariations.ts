import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useBundleVariations(bundleId: string | undefined) {
  return useQuery({
    queryKey: ["bundle-variations", bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_variations")
        .select("*, bundle_variation_items(*, product_variations(name, sku, products:product_id(name)))")
        .eq("bundle_id", bundleId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBundleVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bundleId,
      name,
      name_he,
      price,
      items,
    }: {
      bundleId: string;
      name: string;
      name_he?: string;
      price: number;
      items: { variation_id: string; quantity: number }[];
    }) => {
      const { data: variation, error: vErr } = await supabase
        .from("bundle_variations")
        .insert({ bundle_id: bundleId, name, name_he: name_he || null, price } as any)
        .select()
        .single();
      if (vErr) throw vErr;

      if (items.length > 0) {
        const { error: iErr } = await supabase
          .from("bundle_variation_items")
          .insert(items.map((i) => ({ ...i, bundle_variation_id: variation.id })));
        if (iErr) throw iErr;
      }
      return variation;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bundle-variations", vars.bundleId] });
      toast.success("הוריאציה נוצרה בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת וריאציה"),
  });
}

export function useUpdateBundleVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variationId,
      bundleId,
      name,
      name_he,
      price,
      items,
    }: {
      variationId: string;
      bundleId: string;
      name: string;
      name_he?: string;
      price: number;
      items: { variation_id: string; quantity: number }[];
    }) => {
      const { error: vErr } = await supabase
        .from("bundle_variations")
        .update({ name, name_he: name_he || null, price } as any)
        .eq("id", variationId);
      if (vErr) throw vErr;

      await supabase.from("bundle_variation_items").delete().eq("bundle_variation_id", variationId);
      if (items.length > 0) {
        const { error: iErr } = await supabase
          .from("bundle_variation_items")
          .insert(items.map((i) => ({ ...i, bundle_variation_id: variationId })));
        if (iErr) throw iErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bundle-variations", vars.bundleId] });
      toast.success("הוריאציה עודכנה בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון וריאציה"),
  });
}

export function useDeleteBundleVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variationId, bundleId }: { variationId: string; bundleId: string }) => {
      await supabase.from("bundle_variation_items").delete().eq("bundle_variation_id", variationId);
      const { error } = await supabase.from("bundle_variations").delete().eq("id", variationId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bundle-variations", vars.bundleId] });
      toast.success("הוריאציה נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת וריאציה"),
  });
}

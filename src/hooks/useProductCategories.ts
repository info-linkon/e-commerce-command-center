import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProductCategories(productId: string | undefined) {
  return useQuery({
    queryKey: ["product_categories", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("category_id")
        .eq("product_id", productId!);
      if (error) throw error;
      return (data || []).map((r) => r.category_id);
    },
  });
}

export function useSetProductCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      categoryIds,
    }: {
      productId: string;
      categoryIds: string[];
    }) => {
      // Replace strategy: delete existing then insert new
      const { error: delErr } = await supabase
        .from("product_categories")
        .delete()
        .eq("product_id", productId);
      if (delErr) throw delErr;

      if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({ product_id: productId, category_id }));
        const { error: insErr } = await supabase.from("product_categories").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["product_categories", variables.productId] });
    },
    onError: (err: any) => {
      console.error("Set product categories error:", err);
      toast.error("שגיאה בעדכון קטגוריות");
    },
  });
}
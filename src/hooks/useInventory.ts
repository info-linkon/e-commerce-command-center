import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useInventory(warehouseId?: string) {
  return useQuery({
    queryKey: ["inventory", warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("inventory")
        .select("*, product_variations(*, products(name, category_id, categories(name))), warehouses(name)");
      if (warehouseId) query = query.eq("warehouse_id", warehouseId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ variationId, warehouseId, quantity }: { variationId: string; warehouseId: string; quantity: number }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from("inventory")
        .select("id")
        .eq("variation_id", variationId)
        .eq("warehouse_id", warehouseId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("inventory")
          .update({ quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory")
          .insert({ variation_id: variationId, warehouse_id: warehouseId, quantity });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("הכמות עודכנה בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון כמות"),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePickingItems(orderId?: string) {
  return useQuery({
    queryKey: ["picking_items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_picking_items")
        .select("*, order_items(*, product_variations(*, products(name)))")
        .eq("order_id", orderId!)
        .order("id");
      if (error) throw error;
      return data;
    },
  });
}

export function useTogglePickedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pickingItemId, picked, orderId }: { pickingItemId: string; picked: boolean; orderId: string }) => {
      // 1. Update the picking item
      const { error } = await supabase
        .from("order_picking_items")
        .update({
          picked,
          picked_at: picked ? new Date().toISOString() : null,
        })
        .eq("id", pickingItemId);
      if (error) throw error;

      // 2. Check all picking items for this order to update picking_status
      const { data: allItems, error: fetchErr } = await supabase
        .from("order_picking_items")
        .select("picked")
        .eq("order_id", orderId);
      if (fetchErr) throw fetchErr;

      const total = allItems.length;
      const pickedCount = allItems.filter((i) => i.picked).length;

      let pickingStatus: "not_started" | "in_progress" | "completed" = "not_started";
      if (pickedCount === total) pickingStatus = "completed";
      else if (pickedCount > 0) pickingStatus = "in_progress";

      const { error: orderErr } = await supabase
        .from("orders")
        .update({ picking_status: pickingStatus })
        .eq("id", orderId);
      if (orderErr) throw orderErr;

      return { pickingStatus };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["picking_items", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("שגיאה בעדכון ליקוט"),
  });
}

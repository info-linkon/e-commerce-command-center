import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";
import { toast } from "sonner";

export function useInventoryTransfers() {
  return useQuery({
    queryKey: ["inventory_transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transfers")
        .select("*, from_warehouse:warehouses!inventory_transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!inventory_transfers_to_warehouse_id_fkey(name), inventory_transfer_items(*, product_variations(name, products(name)))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

interface TransferItem {
  variation_id: string;
  quantity: number;
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      from_warehouse_id: string;
      to_warehouse_id: string;
      notes?: string;
      items: TransferItem[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Create transfer record
      const { data: transfer, error } = await supabase
        .from("inventory_transfers")
        .insert({
          from_warehouse_id: input.from_warehouse_id,
          to_warehouse_id: input.to_warehouse_id,
          notes: input.notes || null,
          created_by: user?.id || null,
          status: "completed",
        })
        .select()
        .single();
      if (error) throw error;

      // Process each item
      for (const item of input.items) {
        // Insert transfer item
        await supabase.from("inventory_transfer_items").insert({
          transfer_id: transfer.id,
          variation_id: item.variation_id,
          quantity: item.quantity,
        });

        // Decrease from source
        const { data: srcInv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("variation_id", item.variation_id)
          .eq("warehouse_id", input.from_warehouse_id)
          .maybeSingle();

        const srcQty = srcInv?.quantity || 0;
        const srcNewQty = srcQty - item.quantity;

        if (srcInv) {
          await supabase.from("inventory").update({ quantity: srcNewQty }).eq("id", srcInv.id);
        }

        await logInventoryChange({
          variation_id: item.variation_id,
          warehouse_id: input.from_warehouse_id,
          quantity_change: -item.quantity,
          quantity_after: srcNewQty,
          action_type: "transfer_out",
          reference_id: transfer.id,
        });

        // Increase in destination
        const { data: dstInv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("variation_id", item.variation_id)
          .eq("warehouse_id", input.to_warehouse_id)
          .maybeSingle();

        const dstQty = dstInv?.quantity || 0;
        const dstNewQty = dstQty + item.quantity;

        if (dstInv) {
          await supabase.from("inventory").update({ quantity: dstNewQty }).eq("id", dstInv.id);
        } else {
          await supabase.from("inventory").insert({
            variation_id: item.variation_id,
            warehouse_id: input.to_warehouse_id,
            quantity: dstNewQty,
          });
        }

        await logInventoryChange({
          variation_id: item.variation_id,
          warehouse_id: input.to_warehouse_id,
          quantity_change: item.quantity,
          quantity_after: dstNewQty,
          action_type: "transfer_in",
          reference_id: transfer.id,
        });
      }

      // Sync all affected variations to WooCommerce
      syncMultipleStockToWoo(input.items.map((i) => i.variation_id));

      return transfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("ההעברה בוצעה בהצלחה");
    },
    onError: () => toast.error("שגיאה בביצוע ההעברה"),
  });
}

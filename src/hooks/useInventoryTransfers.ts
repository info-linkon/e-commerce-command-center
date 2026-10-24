import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";
import { toast } from "sonner";
import { planConsolidation, type InventoryRow } from "@/lib/warehouse-consolidation";

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

/**
 * Merge all stock into one main warehouse (client notes §7.3):
 *  1. one completed transfer per source warehouse ("איחוד מחסנים"), with
 *     transfer_out / transfer_in log rows, negative rows included;
 *  2. sources are set to 0 and deactivated (not deleted — deleting cascades
 *     their inventory rows and history);
 *  3. orders still pointing at a source warehouse are re-pointed to the main
 *     one, so later cancels/edits restore stock there;
 *  4. the main warehouse is saved as the default for assigning orders.
 * Total stock per product is unchanged, so WooCommerce needs no sync.
 */
export function useConsolidateWarehouses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { targetId: string; onProgress?: (done: number, total: number) => void }) => {
      const { targetId, onProgress } = input;
      const { data: { user } } = await supabase.auth.getUser();

      // All inventory rows (paged past PostgREST's 1000-row cap).
      const rows: (InventoryRow & { id: string })[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, variation_id, warehouse_id, quantity")
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...((data || []) as typeof rows));
        if (!data || data.length < 1000) break;
      }

      const plan = planConsolidation(rows, targetId);
      const rowId = new Map(rows.map((r) => [`${r.warehouse_id}:${r.variation_id}`, r.id]));
      const targetQty = new Map(
        rows.filter((r) => r.warehouse_id === targetId).map((r) => [r.variation_id, Number(r.quantity) || 0]),
      );
      const total = Array.from(plan.moves.values()).reduce((s, l) => s + l.length, 0);
      let done = 0;

      for (const [sourceId, items] of plan.moves) {
        const { data: transfer, error } = await supabase
          .from("inventory_transfers")
          .insert({
            from_warehouse_id: sourceId,
            to_warehouse_id: targetId,
            notes: "איחוד מחסנים — העברת כל המלאי למחסן הראשי",
            created_by: user?.id || null,
            status: "completed",
          })
          .select()
          .single();
        if (error) throw error;

        const { error: itemsErr } = await supabase
          .from("inventory_transfer_items")
          .insert(items.map((i) => ({ transfer_id: transfer.id, variation_id: i.variation_id, quantity: i.quantity })));
        if (itemsErr) throw itemsErr;

        const logs: Record<string, unknown>[] = [];
        for (const item of items) {
          const srcId = rowId.get(`${sourceId}:${item.variation_id}`);
          if (srcId) {
            const { error: e1 } = await supabase.from("inventory").update({ quantity: 0 }).eq("id", srcId);
            if (e1) throw e1;
          }
          const newQty = (targetQty.get(item.variation_id) || 0) + item.quantity;
          const dstId = rowId.get(`${targetId}:${item.variation_id}`);
          if (dstId) {
            const { error: e2 } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", dstId);
            if (e2) throw e2;
          } else {
            const { data: inserted, error: e3 } = await supabase
              .from("inventory")
              .insert({ variation_id: item.variation_id, warehouse_id: targetId, quantity: newQty })
              .select("id")
              .single();
            if (e3) throw e3;
            rowId.set(`${targetId}:${item.variation_id}`, inserted.id);
          }
          targetQty.set(item.variation_id, newQty);
          logs.push(
            { variation_id: item.variation_id, warehouse_id: sourceId, quantity_change: -item.quantity, quantity_after: 0, action_type: "transfer_out", reference_id: transfer.id, notes: "איחוד מחסנים", created_by: user?.id || null },
            { variation_id: item.variation_id, warehouse_id: targetId, quantity_change: item.quantity, quantity_after: newQty, action_type: "transfer_in", reference_id: transfer.id, notes: "איחוד מחסנים", created_by: user?.id || null },
          );
          onProgress?.(++done, total);
        }
        for (let i = 0; i < logs.length; i += 500) {
          const { error: logErr } = await supabase.from("inventory_log").insert(logs.slice(i, i + 500) as any);
          if (logErr) throw logErr;
        }
      }

      const sourceIds = (await supabase.from("warehouses").select("id").neq("id", targetId)).data?.map((w) => w.id) || [];
      if (sourceIds.length) {
        const { error: deactErr } = await supabase.from("warehouses").update({ is_active: false }).in("id", sourceIds);
        if (deactErr) throw deactErr;
        const { error: ordErr } = await supabase
          .from("orders")
          .update({ assigned_warehouse_id: targetId })
          .in("assigned_warehouse_id", sourceIds);
        if (ordErr) throw ordErr;
      }
      const { error: activeErr } = await supabase.from("warehouses").update({ is_active: true }).eq("id", targetId);
      if (activeErr) throw activeErr;

      const { error: settingErr } = await supabase
        .from("site_content")
        .upsert(
          { page: "settings", section: "inventory", content: { main_warehouse_id: targetId }, updated_at: new Date().toISOString() },
          { onConflict: "page,section" },
        );
      if (settingErr) throw settingErr;

      return plan;
    },
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["inventory_transfers"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(`המחסנים אוחדו. ${plan.negativeAfter ? `${plan.negativeAfter} מוצרים עדיין במינוס — יש לעדכן ספירה` : "אין מלאי במינוס"}`);
    },
    onError: (e: Error) => toast.error(`האיחוד נעצר: ${e.message}. ניתן להריץ שוב — הוא ממשיך ממה שנשאר.`),
  });
}

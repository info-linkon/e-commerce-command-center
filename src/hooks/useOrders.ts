import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";

async function syncOrderStatusToWoo(orderId: string) {
  try {
    // Mark as syncing
    await supabase.from("orders").update({ woo_sync_status: "syncing", woo_sync_error: null }).eq("id", orderId);
    
    const { data, error } = await supabase.functions.invoke("woo-sync", {
      body: { action: "update_order_status", order_id: orderId },
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    await supabase.from("orders").update({ woo_sync_status: "synced", woo_sync_error: null }).eq("id", orderId);
  } catch (err: any) {
    console.error("Woo status sync error:", err);
    await supabase.from("orders").update({ 
      woo_sync_status: "failed", 
      woo_sync_error: err?.message || "שגיאה לא ידועה" 
    }).eq("id", orderId);
  }
}

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface OrderItem {
  variation_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ["orders", status],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, warehouses(name)")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ["orders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, product_variations(*, products(name))), warehouses(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      notes?: string;
      total: number;
      status?: OrderStatus;
      source?: string;
      cash_register_id?: string;
      items: OrderItem[];
    }) => {
      const { items, source, cash_register_id, ...rest } = input;
      const orderPayload: any = { ...rest };
      if (source) orderPayload.source = source;
      if (cash_register_id) orderPayload.cash_register_id = cash_register_id;
      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const orderItems = items.map((item) => ({
          order_id: order.id,
          ...item,
        }));
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);
        if (itemsError) throw itemsError;

        // For POS orders (completed immediately), deduct inventory + log
        if (input.status === "completed") {
          for (const item of items) {
            const { data: invRecords } = await supabase
              .from("inventory")
              .select("*")
              .eq("variation_id", item.variation_id);
            
            if (invRecords && invRecords.length > 0) {
              let remaining = item.quantity;
              for (const inv of invRecords) {
                if (remaining <= 0) break;
                const decrease = Math.min(remaining, inv.quantity);
                const newQty = inv.quantity - decrease;
                await supabase
                  .from("inventory")
                  .update({ quantity: newQty })
                  .eq("id", inv.id);
                
                await logInventoryChange({
                  variation_id: item.variation_id,
                  warehouse_id: inv.warehouse_id,
                  quantity_change: -decrease,
                  quantity_after: newQty,
                  action_type: "sale",
                  reference_id: order.id,
                  notes: `מכירה POS - הזמנה #${order.order_number}`,
                });

                remaining -= decrease;
              }
            }
          }
          // Sync POS items to WooCommerce
          syncMultipleStockToWoo(items.map((i) => i.variation_id));
        }
        // For non-POS orders, inventory deduction happens at warehouse assignment
      }

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("ההזמנה נוצרה בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת הזמנה"),
  });
}

export function useAssignWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, warehouseId }: { orderId: string; warehouseId: string }) => {
      // 1. Get order with items
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*, order_items(*, product_variations(*, products(name)))")
        .eq("id", orderId)
        .single();
      if (orderErr) throw orderErr;

      // Prevent re-assignment if already assigned
      if (order.assigned_warehouse_id) {
        throw new Error("ההזמנה כבר שויכה למחסן");
      }

      const items = (order.order_items as any[]) || [];

      // 2. Deduct inventory from the assigned warehouse + log
      for (const item of items) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("*")
          .eq("variation_id", item.variation_id)
          .eq("warehouse_id", warehouseId)
          .maybeSingle();

        const currentQty = inv?.quantity || 0;
        const newQty = currentQty - item.quantity;

        if (inv) {
          await supabase
            .from("inventory")
            .update({ quantity: newQty })
            .eq("id", inv.id);
        } else {
          // Create negative inventory record if none exists
          await supabase
            .from("inventory")
            .insert({ variation_id: item.variation_id, warehouse_id: warehouseId, quantity: newQty });
        }

        await logInventoryChange({
          variation_id: item.variation_id,
          warehouse_id: warehouseId,
          quantity_change: -item.quantity,
          quantity_after: newQty,
          action_type: "sale",
          reference_id: orderId,
          notes: `שיוך הזמנה #${order.order_number} למחסן`,
        });
      }

      // Sync to WooCommerce
      syncMultipleStockToWoo(items.map((item: any) => item.variation_id));

      // 3. Update order with warehouse assignment + status to processing
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          assigned_warehouse_id: warehouseId,
          status: "processing" as OrderStatus,
          picking_status: "not_started",
        })
        .eq("id", orderId);
      if (updateErr) throw updateErr;

      // 4. Create picking items
      const pickingItems = items.map((item: any) => ({
        order_id: orderId,
        order_item_id: item.id,
      }));
      if (pickingItems.length > 0) {
        const { error: pickErr } = await supabase
          .from("order_picking_items")
          .insert(pickingItems);
        if (pickErr) throw pickErr;
      }

      // 5. Sync status to WooCommerce
      syncOrderStatusToWoo(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("ההזמנה שויכה למחסן והמלאי עודכן");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בשיוך למחסן"),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Get order with items
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();
      if (orderErr) throw orderErr;

      if (order.status === "cancelled") {
        throw new Error("ההזמנה כבר בוטלה");
      }

      const items = (order.order_items as any[]) || [];
      const warehouseId = order.assigned_warehouse_id;

      // 2. If warehouse was assigned, restore inventory
      if (warehouseId) {
        for (const item of items) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("*")
            .eq("variation_id", item.variation_id)
            .eq("warehouse_id", warehouseId)
            .maybeSingle();

          const currentQty = inv?.quantity || 0;
          const newQty = currentQty + item.quantity;

          if (inv) {
            await supabase
              .from("inventory")
              .update({ quantity: newQty })
              .eq("id", inv.id);
          } else {
            await supabase
              .from("inventory")
              .insert({ variation_id: item.variation_id, warehouse_id: warehouseId, quantity: newQty });
          }

          await logInventoryChange({
            variation_id: item.variation_id,
            warehouse_id: warehouseId,
            quantity_change: item.quantity,
            quantity_after: newQty,
            action_type: "adjustment",
            reference_id: orderId,
            notes: `ביטול הזמנה #${order.order_number} — החזרת מלאי`,
          });
        }

        // Sync restored stock to WooCommerce
        syncMultipleStockToWoo(items.map((item: any) => item.variation_id));
      }

      // 3. Update order status
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" as OrderStatus })
        .eq("id", orderId);
      if (updateErr) throw updateErr;

      // Sync cancelled status to WooCommerce
      syncOrderStatusToWoo(orderId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("ההזמנה בוטלה והמלאי הוחזר");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בביטול הזמנה"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      // Sync status to WooCommerce
      syncOrderStatusToWoo(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("הסטטוס עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון סטטוס"),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("ההזמנה נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת הזמנה"),
  });
}

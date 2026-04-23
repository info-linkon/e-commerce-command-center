import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";
import { expandToInventoryRows } from "@/lib/order-inventory";

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

export type OrderStatus = "pending" | "processing" | "picking" | "shipping" | "completed" | "cancelled";

export interface OrderItem {
  variation_id?: string; // optional — POS supports custom (general) line items without a product
  quantity: number;
  unit_price: number;
  total_price: number;
  bundle_variation_id?: string;
}

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ["orders", status],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, warehouses(name), payments(cash_register_id)")
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
        .select("*, order_items(*, product_variations(*, products(name, name_ar, sku)), bundle_variations(id, name, name_he, sku)), warehouses(name)")
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
      payment_method?: string;
      delivery_method?: string;
      created_by?: string;
      discount_type?: string;
      discount_value?: number;
      discount_amount?: number;
      created_at?: string;
      skip_auto_payment?: boolean;
      items: OrderItem[];
    }) => {
      const { items, source, cash_register_id, payment_method, delivery_method, created_by, discount_type, discount_value, discount_amount, created_at, skip_auto_payment, ...rest } = input;
      const orderPayload: any = { ...rest };
      if (source) orderPayload.source = source;
      if (cash_register_id) orderPayload.cash_register_id = cash_register_id;
      if (payment_method) orderPayload.payment_method = payment_method;
      if (created_by) orderPayload.created_by = created_by;
      if (created_at) orderPayload.created_at = created_at;
      if (discount_type && discount_type !== "none") {
        orderPayload.discount_type = discount_type;
        orderPayload.discount_value = discount_value || 0;
        orderPayload.discount_amount = discount_amount || 0;
      }
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
      }

      // Auto-create payment record for POS orders (unless caller opts out, e.g.
      // HYP-link flow where the payment is recorded by hyp-verify after the
      // customer actually pays).
      if (source === "pos" && payment_method && !skip_auto_payment) {
        const paymentRecord: any = {
          order_id: order.id,
          amount: input.total,
          payment_method: payment_method as any,
        };
        if (payment_method === "cash" && cash_register_id) {
          paymentRecord.cash_register_id = cash_register_id;
        }
        await supabase.from("payments").insert(paymentRecord);

        // Atomic cash register balance update (server-side RPC avoids the
        // read-modify-write race when two terminals charge at the same time).
        if (payment_method === "cash" && cash_register_id) {
          await supabase.rpc("increment_cash_register" as any, {
            reg_id: cash_register_id,
            delta: input.total,
          });
        }
      }

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
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
        .select("*, order_items(*, product_variations(*, products(name, name_ar)))")
        .eq("id", orderId)
        .single();
      if (orderErr) throw orderErr;

      // Prevent re-assignment if already assigned
      if (order.assigned_warehouse_id) {
        throw new Error("ההזמנה כבר שויכה למחסן");
      }

      const items = (order.order_items as any[]) || [];

      // 2. Deduct inventory — expand bundles to their actual component variations
      const inventoryRows = await expandToInventoryRows(items as any);

      for (const row of inventoryRows) {
        const { data: inv } = await supabase
          .from("inventory")
          .select("*")
          .eq("variation_id", row.variation_id)
          .eq("warehouse_id", warehouseId)
          .maybeSingle();

        const currentQty = inv?.quantity || 0;
        const newQty = currentQty - row.quantity;

        if (inv) {
          await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
        } else {
          await supabase
            .from("inventory")
            .insert({ variation_id: row.variation_id, warehouse_id: warehouseId, quantity: newQty });
        }

        await logInventoryChange({
          variation_id: row.variation_id,
          warehouse_id: warehouseId,
          quantity_change: -row.quantity,
          quantity_after: newQty,
          action_type: "sale",
          reference_id: orderId,
          notes: `שיוך הזמנה #${order.order_number} למחסן`,
        });
      }

      // Sync stock to WooCommerce (all sources — stock is global).
      syncMultipleStockToWoo(inventoryRows.map((r) => r.variation_id));

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

      // 4. Create picking items (bundle lines expand to component rows, regular lines stay single)
      const pickingItems: Array<{ order_id: string; order_item_id: string; variation_id: string; quantity: number }> = [];

      for (const item of items) {
        if (!item.variation_id) continue; // skip custom (general) line items — no picking needed
        const { data: bundle } = await supabase
          .from("bundles")
          .select("id, bundle_type")
          .eq("product_id", item.product_variations?.product_id)
          .maybeSingle();

        if (bundle?.id) {
          let bundleComponents: Array<{ variation_id: string; quantity: number }> = [];

          if (bundle.bundle_type === "variable_bundle") {
            // For variable bundles, get components from first bundle_variation (or match by name)
            const { data: bvs } = await supabase
              .from("bundle_variations")
              .select("id")
              .eq("bundle_id", bundle.id)
              .limit(1);

            if (bvs && bvs.length > 0) {
              const { data: bvItems, error: bvErr } = await supabase
                .from("bundle_variation_items")
                .select("variation_id, quantity")
                .eq("bundle_variation_id", bvs[0].id);
              if (bvErr) throw bvErr;
              bundleComponents = bvItems || [];
            }
          } else {
            const { data: biItems, error: biErr } = await supabase
              .from("bundle_items")
              .select("variation_id, quantity")
              .eq("bundle_id", bundle.id);
            if (biErr) throw biErr;
            bundleComponents = biItems || [];
          }

          for (const component of bundleComponents || []) {
            pickingItems.push({
              order_id: orderId,
              order_item_id: item.id,
              variation_id: component.variation_id,
              quantity: component.quantity * item.quantity,
            });
          }
        } else {
          pickingItems.push({
            order_id: orderId,
            order_item_id: item.id,
            variation_id: item.variation_id,
            quantity: item.quantity,
          });
        }
      }

      if (pickingItems.length > 0) {
        const { error: pickErr } = await supabase
          .from("order_picking_items")
          .insert(pickingItems as any);
        if (pickErr) throw pickErr;
      }

      // 5. Sync status to WooCommerce only for website orders
      if (order.source === "website") {
        syncOrderStatusToWoo(orderId);
      }
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
        .select("*, order_items(*, product_variations(product_id))")
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
        const inventoryRows = await expandToInventoryRows(items as any);

        for (const row of inventoryRows) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("*")
            .eq("variation_id", row.variation_id)
            .eq("warehouse_id", warehouseId)
            .maybeSingle();

          const currentQty = inv?.quantity || 0;
          const newQty = currentQty + row.quantity;

          if (inv) {
            await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
          } else {
            await supabase
              .from("inventory")
              .insert({ variation_id: row.variation_id, warehouse_id: warehouseId, quantity: newQty });
          }

          await logInventoryChange({
            variation_id: row.variation_id,
            warehouse_id: warehouseId,
            quantity_change: row.quantity,
            quantity_after: newQty,
            action_type: "adjustment",
            reference_id: orderId,
            notes: `ביטול הזמנה #${order.order_number} — החזרת מלאי`,
          });
        }

        // Sync restored stock to WooCommerce.
        syncMultipleStockToWoo(inventoryRows.map((r) => r.variation_id));
      }

      // 3. Reverse payments — refund cash to register, then delete payment records
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, payment_method, cash_register_id")
        .eq("order_id", orderId);

      for (const p of payments || []) {
        if (p.payment_method === "cash" && p.cash_register_id) {
          await supabase.rpc("increment_cash_register" as any, {
            reg_id: p.cash_register_id,
            delta: -Number(p.amount),
          });
        }
      }

      if (payments && payments.length > 0) {
        await supabase.from("payments").delete().eq("order_id", orderId);
        await supabase.from("payment_events").insert({
          order_id: orderId,
          event_type: "order_cancelled_refund",
          success: true,
          message: `בוטלו ${payments.length} תשלומים — החזרת ₪${payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)} לקופה`,
        });
      }

      // 4. Update order status
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" as OrderStatus })
        .eq("id", orderId);
      if (updateErr) throw updateErr;

      // Sync cancelled status to WooCommerce only for website orders
      if (order.source === "website") {
        syncOrderStatusToWoo(orderId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("ההזמנה בוטלה והמלאי הוחזר");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בביטול הזמנה"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data: order } = await supabase.from("orders").select("source, total").eq("id", id).single();

      // Prevent completing an order without full payment
      if (status === "completed") {
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, payment_method, cash_register_id")
          .eq("order_id", id);
        const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const orderTotal = Number(order?.total || 0);
        if (totalPaid < orderTotal) {
          throw new Error(`לא ניתן להשלים הזמנה ללא תשלום מלא. שולם ₪${totalPaid.toFixed(2)} מתוך ₪${orderTotal.toFixed(2)}`);
        }
        // Cash payments must have a cash register assigned
        const cashWithoutRegister = (payments || []).some(
          (p: any) => p.payment_method === "cash" && !p.cash_register_id
        );
        if (cashWithoutRegister) {
          throw new Error("לא ניתן להשלים הזמנה — תשלום מזומן חייב להיות משויך לקופה");
        }
      }

      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      if (order?.source === "website") {
        syncOrderStatusToWoo(id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("הסטטוס עודכן");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון סטטוס"),
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

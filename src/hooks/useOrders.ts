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
        .select("*, warehouses(name), payments(cash_register_id), documents(id, status)")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * הזמנה נחשבת "עם חשבונית" אם:
 *  - סומנה ידנית (invoice_issued_manually)
 *  - יש URL לחשבונית (invoice_url) שנשמר ע"י ezcount-doc
 *  - יש מסמך מקושר בסטטוס issued
 */
export function orderHasInvoice(order: any): boolean {
  if (!order) return false;
  // הזמנות אשראי תמיד מונפקת להן חשבונית אוטומטית דרך HYP/EZCount
  if (order.payment_method === "credit") return true;
  if (order.invoice_issued_manually === true) return true;
  if (order.invoice_url) return true;
  const docs = (order.documents || []) as Array<{ status: string }>;
  return docs.some((d) => d.status === "issued");
}

export function orderInvoiceKind(order: any): "auto" | "manual" | "none" {
  if (!order) return "none";
  // אשראי = תמיד אוטומטית
  if (order.payment_method === "credit") return "auto";
  const docs = (order.documents || []) as Array<{ status: string }>;
  const hasAuto = !!order.invoice_url || docs.some((d) => d.status === "issued");
  if (hasAuto) return "auto";
  if (order.invoice_issued_manually === true) return "manual";
  return "none";
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
      payments?: { amount: number; payment_method: "cash" | "credit" | "bit"; cash_register_id?: string; reference?: string }[];
      digital_payment_amount?: number;
    }) => {
      const { items, source, cash_register_id, payment_method, delivery_method, created_by, discount_type, discount_value, discount_amount, created_at, skip_auto_payment, payments: splitPayments, digital_payment_amount, ...rest } = input;
      const orderPayload: any = { ...rest };
      if (source) orderPayload.source = source;
      if (cash_register_id) orderPayload.cash_register_id = cash_register_id;
      if (payment_method) orderPayload.payment_method = payment_method;
      if (created_by) orderPayload.created_by = created_by;
      if (typeof digital_payment_amount === "number") orderPayload.digital_payment_amount = digital_payment_amount;
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

      // Split-payment path: caller provided multiple payment lines (POS split mode).
      // Bulk-insert all rows, then increment non-deferred cash registers per line.
      if (splitPayments && splitPayments.length > 0) {
        const rows = splitPayments.map((p) => ({
          order_id: order.id,
          amount: p.amount,
          payment_method: p.payment_method as any,
          cash_register_id: p.payment_method === "cash" ? (p.cash_register_id || null) : null,
          reference: p.reference || null,
        }));
        const { error: payErr } = await supabase.from("payments").insert(rows);
        if (payErr) throw payErr;

        const cashRegIds = Array.from(new Set(
          splitPayments
            .filter((p) => p.payment_method === "cash" && p.cash_register_id)
            .map((p) => p.cash_register_id as string),
        ));
        const deferredIds = new Set<string>();
        if (cashRegIds.length > 0) {
          const { data: regs } = await supabase
            .from("cash_registers")
            .select("id, requires_completed_order")
            .in("id", cashRegIds);
          for (const r of (regs as any[]) || []) {
            if (r.requires_completed_order) deferredIds.add(r.id);
          }
        }
        for (const p of splitPayments) {
          if (
            p.payment_method === "cash" &&
            p.cash_register_id &&
            !deferredIds.has(p.cash_register_id)
          ) {
            await supabase.rpc("increment_cash_register" as any, {
              reg_id: p.cash_register_id,
              delta: p.amount,
            });
          }
        }
      }
      // Auto-create payment record for POS orders (unless caller opts out, e.g.
      // HYP-link flow where the payment is recorded by hyp-verify after the
      // customer actually pays).
      else if (source === "pos" && payment_method && !skip_auto_payment) {
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
        // Skip "deferred" registers — their balance is updated by a DB trigger
        // only when the order reaches `completed` status.
        if (payment_method === "cash" && cash_register_id) {
          const { data: reg } = await supabase
            .from("cash_registers")
            .select("requires_completed_order")
            .eq("id", cash_register_id)
            .maybeSingle();
          if (!reg?.requires_completed_order) {
            await supabase.rpc("increment_cash_register" as any, {
              reg_id: cash_register_id,
              delta: input.total,
            });
          }
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
        // Idempotency guard: if a restore log entry already exists for this
        // order, skip the inventory step entirely (a previous run succeeded).
        const { data: existingRestore } = await supabase
          .from("inventory_log")
          .select("id")
          .eq("reference_id", orderId)
          .eq("action_type", "adjustment")
          .ilike("notes", "%החזרת מלאי%")
          .limit(1);

        const inventoryRows = existingRestore && existingRestore.length > 0
          ? []
          : await expandToInventoryRows(items as any);

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
            const { error: upErr } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
            if (upErr) throw new Error(`שגיאה בהחזרת מלאי: ${upErr.message}`);
          } else {
            const { error: insErr } = await supabase
              .from("inventory")
              .insert({ variation_id: row.variation_id, warehouse_id: warehouseId, quantity: newQty });
            if (insErr) throw new Error(`שגיאה בהחזרת מלאי: ${insErr.message}`);
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

        if (inventoryRows.length > 0) {
          // Sync restored stock to WooCommerce.
          syncMultipleStockToWoo(inventoryRows.map((r) => r.variation_id));
        }
      }

      // 3. Reverse payments — refund cash to register, then delete payment records
      const { data: payments } = await supabase
        .from("payments")
        .select("id, amount, payment_method, cash_register_id")
        .eq("order_id", orderId);

      // Look up which registers are "deferred" — for those, the balance is
      // managed by a DB trigger tied to order status, so skip manual refund here.
      const cashRegIds = Array.from(
        new Set(
          (payments || [])
            .filter((p) => p.payment_method === "cash" && p.cash_register_id)
            .map((p) => p.cash_register_id as string),
        ),
      );
      const deferredRegIds = new Set<string>();
      if (cashRegIds.length > 0) {
        const { data: regs } = await supabase
          .from("cash_registers")
          .select("id, requires_completed_order")
          .in("id", cashRegIds);
        for (const r of (regs as any[]) || []) {
          if (r.requires_completed_order) deferredRegIds.add(r.id);
        }
      }

      for (const p of payments || []) {
        if (
          p.payment_method === "cash" &&
          p.cash_register_id &&
          !deferredRegIds.has(p.cash_register_id)
        ) {
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
      const { data: actorData } = await supabase.auth.getUser();
      const actorId = actorData?.user?.id || null;
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" as OrderStatus, cancelled_by: actorId } as any)
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
      // Block direct cancellation through the generic status updater —
      // cancellation must go through useCancelOrder so inventory and
      // payments are properly reversed.
      if (status === "cancelled") {
        throw new Error("לביטול הזמנה השתמש בכפתור 'בטל הזמנה'");
      }

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

      const { data: actorData } = await supabase.auth.getUser();
      const actorId = actorData?.user?.id || null;
      const updatePayload: any = { status };
      if (status === "completed") updatePayload.completed_by = actorId;
      const { error } = await supabase.from("orders").update(updatePayload).eq("id", id);
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
      // 1. Load order header (status + warehouse) so we know whether to
      //    restore inventory and reverse register balances.
      const { data: ord } = await supabase
        .from("orders")
        .select("status, assigned_warehouse_id, order_number")
        .eq("id", id)
        .single();

      // 2. Restore inventory if the order was assigned to a warehouse AND
      //    it wasn't already cancelled (cancelled orders had inventory
      //    restored at cancel time — restoring again would double-credit).
      if (ord?.assigned_warehouse_id && ord.status !== "cancelled") {
        const { data: itemsForRestore } = await supabase
          .from("order_items")
          .select("variation_id, quantity, product_variations(product_id)")
          .eq("order_id", id);

        const inventoryRows = await expandToInventoryRows((itemsForRestore || []) as any);
        const warehouseId = ord.assigned_warehouse_id;

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
            const { error: upErr } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
            if (upErr) throw new Error(`שגיאה בהחזרת מלאי: ${upErr.message}`);
          } else {
            const { error: insErr } = await supabase
              .from("inventory")
              .insert({ variation_id: row.variation_id, warehouse_id: warehouseId, quantity: newQty });
            if (insErr) throw new Error(`שגיאה בהחזרת מלאי: ${insErr.message}`);
          }

          await logInventoryChange({
            variation_id: row.variation_id,
            warehouse_id: warehouseId,
            quantity_change: row.quantity,
            quantity_after: newQty,
            action_type: "adjustment",
            reference_id: id,
            notes: `מחיקת הזמנה #${ord.order_number} — החזרת מלאי`,
          });
        }

        if (inventoryRows.length > 0) {
          syncMultipleStockToWoo(inventoryRows.map((r) => r.variation_id));
        }
      }

      // 3. Reverse cash register balances for any cash payments on
      //    non-deferred registers (deferred registers are managed by trigger
      //    and only reflect completed orders — nothing to reverse).
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, payment_method, cash_register_id")
        .eq("order_id", id);

      const cashRegIds = Array.from(
        new Set(
          (payments || [])
            .filter((p) => p.payment_method === "cash" && p.cash_register_id)
            .map((p) => p.cash_register_id as string),
        ),
      );
      const deferredRegIds = new Set<string>();
      if (cashRegIds.length > 0) {
        const { data: regs } = await supabase
          .from("cash_registers")
          .select("id, requires_completed_order")
          .in("id", cashRegIds);
        for (const r of (regs as any[]) || []) {
          if (r.requires_completed_order) deferredRegIds.add(r.id);
        }
      }
      // Only reverse balance if order is currently completed (otherwise
      // balance was never added). For deferred registers — never reverse.
      if (ord?.status === "completed") {
        for (const p of payments || []) {
          if (
            p.payment_method === "cash" &&
            p.cash_register_id &&
            !deferredRegIds.has(p.cash_register_id)
          ) {
            await supabase.rpc("increment_cash_register" as any, {
              reg_id: p.cash_register_id,
              delta: -Number(p.amount),
            });
          }
        }
      }

      // 4. Delete dependent rows (no FK CASCADE on most tables)
      await supabase.from("deliveries").delete().eq("order_id", id);
      await supabase.from("order_picking_items").delete().eq("order_id", id);
      await supabase.from("payments").delete().eq("order_id", id);
      await supabase.from("payment_events").delete().eq("order_id", id);
      await supabase.from("documents").delete().eq("order_id", id);
      await supabase.from("order_items").delete().eq("order_id", id);

      // 5. Finally delete the order
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success("ההזמנה נמחקה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה במחיקת הזמנה"),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logInventoryChange } from "@/hooks/useInventoryLog";

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
        .select("*")
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
        .select("*, order_items(*, product_variations(*, products(name)))")
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
        }
        // For non-POS orders, inventory deduction happens at warehouse assignment (step 4)
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

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
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

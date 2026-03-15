import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export function useDeliveries(status?: DeliveryStatus) {
  return useQuery({
    queryKey: ["deliveries", status],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, orders(order_number, customer_name, customer_phone, total, status), delivery_companies(name, is_internal)")
        .order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOrderDelivery(orderId?: string) {
  return useQuery({
    queryKey: ["deliveries", "order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, delivery_companies(name, is_internal)")
        .eq("order_id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { order_id: string; delivery_company_id: string; notes?: string }) => {
      const { data, error } = await supabase.from("deliveries").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["deliveries", "order", vars.order_id] });
      toast.success("משלוח נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת משלוח"),
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DeliveryStatus }) => {
      const updates: any = { status };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      const { error } = await supabase.from("deliveries").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("סטטוס משלוח עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון סטטוס"),
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { printDeliveryLabels, type DeliveryLabelData } from "@/lib/delivery-label";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export function useDeliveries(status?: DeliveryStatus) {
  return useQuery({
    queryKey: ["deliveries", status],
    queryFn: async () => {
      let query = supabase
        .from("deliveries")
        .select("*, orders(order_number, customer_name, customer_phone, total, status), delivery_companies(name, is_internal, provider)")
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
        .select("*, delivery_companies(name, is_internal, provider)")
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

// ---------- Olivery delivery API ----------

export interface OliveryArea { id: number; name: string; code: string }
export interface OliverySubArea { id: number; name: string; code: string; area_id: number; area_name: string }

async function invokeOlivery<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("olivery", { body });
  if (error) {
    // Surface the function's error message when available
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx?.json) msg = (await ctx.json())?.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export function useOliveryAreas(enabled = true) {
  return useQuery({
    queryKey: ["olivery", "areas"],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => (await invokeOlivery<{ areas: OliveryArea[] }>({ action: "areas" })).areas,
  });
}

export function useOliverySubAreas(enabled = true) {
  return useQuery({
    queryKey: ["olivery", "sub_areas"],
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => (await invokeOlivery<{ sub_areas: OliverySubArea[] }>({ action: "sub_areas" })).sub_areas,
  });
}

/** Creates the local delivery row and then the shipment in Olivery. */
export function useCreateOliveryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      delivery_company_id: string;
      notes?: string;
      area: string;
      sub_area?: string;
      cod_amount: number;
      address?: string;
    }) => {
      const { data: delivery, error } = await supabase
        .from("deliveries")
        .insert({ order_id: input.order_id, delivery_company_id: input.delivery_company_id, notes: input.notes })
        .select()
        .single();
      if (error) throw error;
      try {
        return await invokeOlivery<{ external_id: string; external_sequence: string | null }>({
          action: "create",
          delivery_id: delivery.id,
          area: input.area,
          sub_area: input.sub_area,
          cod_amount: input.cod_amount,
          address: input.address,
          notes: input.notes,
        });
      } catch (e) {
        // Roll back the local row so the user can retry from the form
        await supabase.from("deliveries").delete().eq("id", delivery.id);
        throw e;
      }
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["deliveries", "order", vars.order_id] });
      toast.success(`משלוח נוצר ב-Olivery${res?.external_sequence ? ` (${res.external_sequence})` : ""}`);
    },
    onError: (e: Error) => toast.error(`שגיאה ביצירת משלוח ב-Olivery: ${e.message}`),
  });
}

/** Retries sending an existing local delivery to Olivery. */
export function useSendDeliveryToOlivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { delivery_id: string; area: string; sub_area?: string; cod_amount: number; address?: string }) =>
      invokeOlivery({ action: "create", ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("המשלוח נשלח ל-Olivery");
    },
    onError: (e: Error) => toast.error(`שגיאה בשליחה ל-Olivery: ${e.message}`),
  });
}

export function useSyncOliveryDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (delivery_id: string) => invokeOlivery({ action: "sync", delivery_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("סטטוס Olivery עודכן");
    },
    onError: (e: Error) => toast.error(`שגיאה בסנכרון: ${e.message}`),
  });
}

export function useSyncAllOliveryDeliveries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => invokeOlivery<{ count: number }>({ action: "sync_all" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success(`סונכרנו ${res?.count ?? 0} משלוחי Olivery`);
    },
    onError: (e: Error) => toast.error(`שגיאה בסנכרון: ${e.message}`),
  });
}

/** Hebrew labels for Olivery statuses. */
export const oliveryStatusLabels: Record<string, string> = {
  waiting: "ממתין",
  picking_up: "בדרך לאיסוף",
  picked_up: "נאסף",
  in_branch: "בסניף",
  to_branch: "בדרך לסניף",
  ready_for_dispatch: "מוכן להפצה",
  in_progress: "בדרך ללקוח",
  delivered: "נמסר",
  delivered_stuck: "נמסר (תקוע)",
  delivered_partial: "נמסר חלקית",
  rejected: "נדחה",
  rejected_partial: "נדחה חלקית",
  rejected_after_arrival: "נדחה בהגעה",
  reschedule: "נדחה למועד אחר",
  stuck: "תקוע",
  NO_ANSWER: "אין מענה",
  replacement: "החלפה",
  money_received: "כסף התקבל",
  money_in: "כסף נכנס",
  money_out: "כסף הועבר",
  money_out_to_branch: "כסף הועבר לסניף",
  paid: "שולם לעסק",
  completed: "הושלם",
  ready_for_return: "מוכן להחזרה",
  returned_in_progress: "בהחזרה",
  returned_in_progress_to_branch: "בהחזרה לסניף",
  branch_returned: "הוחזר לסניף",
  returned_delivered: "הוחזר",
  completed_returned: "החזרה הושלמה",
  delivery_fee_after_rejection: "דמי משלוח לאחר דחייה",
  canceled: "בוטל",
  deleted: "נמחק",
};

// ---------- Shipping labels ----------

interface LabelRow {
  external_sequence: string | null;
  external_area: string | null;
  external_sub_area: string | null;
  cod_amount: number | null;
  notes: string | null;
  created_at: string;
  delivery_companies: { name: string } | null;
  orders: {
    order_number: number;
    customer_name: string | null;
    customer_phone: string | null;
    shipping_address: string | null;
    shipping_city: string | null;
    total: number;
    digital_payment_amount: number;
    order_items: {
      quantity: number;
      product_variations: { products: { name: string } | null } | null;
      bundle_variations: { name: string; name_he: string | null } | null;
    }[];
  } | null;
}

/** Loads everything needed to print labels for the given delivery ids (keeps the given order). */
export async function fetchDeliveryLabelData(deliveryIds: string[]): Promise<DeliveryLabelData[]> {
  const { data, error } = await supabase
    .from("deliveries")
    .select(
      "id, external_sequence, external_area, external_sub_area, cod_amount, notes, created_at, delivery_companies(name), orders(order_number, customer_name, customer_phone, shipping_address, shipping_city, total, digital_payment_amount, order_items(quantity, product_variations(products(name)), bundle_variations(name, name_he)))",
    )
    .in("id", deliveryIds);
  if (error) throw error;
  const byId = new Map((data as unknown as (LabelRow & { id: string })[]).map((d) => [d.id, d]));
  return deliveryIds
    .map((id) => byId.get(id))
    .filter((d): d is LabelRow & { id: string } => !!d && !!d.orders)
    .map((d) => {
      const o = d.orders!;
      const items = (o.order_items || []).map((i) => ({
        name: i.product_variations?.products?.name || i.bundle_variations?.name_he || i.bundle_variations?.name || "",
        quantity: Number(i.quantity) || 0,
      }));
      return {
        orderNumber: o.order_number,
        trackingNumber: d.external_sequence,
        companyName: d.delivery_companies?.name,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        address: [o.shipping_address, o.shipping_city].filter(Boolean).join(", "),
        area: d.external_area,
        subArea: d.external_sub_area,
        codAmount: d.cod_amount ?? Math.max(0, Number(o.total || 0) - Number(o.digital_payment_amount || 0)),
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        items,
        notes: d.notes,
        createdAt: d.created_at,
      };
    });
}

/** Call from a click handler: opens the print window and fills it with the labels. */
export function printLabelsForDeliveries(deliveryIds: string[]) {
  printDeliveryLabels(() => fetchDeliveryLabelData(deliveryIds)).catch((e: Error) =>
    toast.error(`שגיאה בהדפסת מדבקה: ${e.message}`),
  );
}

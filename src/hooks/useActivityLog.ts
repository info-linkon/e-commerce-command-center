import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivityActionType =
  | "order_create"
  | "order_update"
  | "payment"
  | "intake"
  | "transfer"
  | "adjustment"
  | "expense"
  | "cash_transfer"
  | "document";

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_name: string | null;
  action_type: ActivityActionType;
  description: string;
  reference_id?: string;
  reference_label?: string;
  reference_link?: string;
  amount?: number;
}

interface Filters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  actionType?: ActivityActionType;
}

export function useActivityLog(filters: Filters = {}) {
  return useQuery({
    queryKey: ["activity_log", filters],
    queryFn: async (): Promise<ActivityEntry[]> => {
      const from = filters.dateFrom;
      const to = filters.dateTo ? filters.dateTo : undefined;

      const range = <T extends { gte: any; lte: any }>(q: T): T => {
        let r: any = q;
        if (from) r = r.gte("created_at", from);
        if (to) r = r.lte("created_at", to);
        return r;
      };

      const [
        profilesData,
        ordersRes,
        ordersUpdRes,
        paymentsRes,
        intakeRes,
        transfersRes,
        adjustRes,
        expensesRes,
        cashTransfersRes,
        documentsRes,
      ] = await Promise.all([
        (async () => {
          try {
            const { data } = await supabase.functions.invoke("admin-list-users", { body: {} });
            return (data?.profiles || []) as Array<{ user_id: string; display_name: string | null; email?: string | null }>;
          } catch {
            const { data } = await supabase.from("profiles").select("user_id, display_name");
            return (data || []) as any[];
          }
        })(),
        range(
          supabase
            .from("orders")
            .select("id, order_number, customer_name, total, created_at, created_by")
            .order("created_at", { ascending: false })
            .limit(300),
        ),
        // Updates: where updated_at differs meaningfully from created_at
        (() => {
          let q: any = supabase
            .from("orders")
            .select("id, order_number, status, updated_at, created_at, created_by")
            .order("updated_at", { ascending: false })
            .limit(300);
          if (from) q = q.gte("updated_at", from);
          if (to) q = q.lte("updated_at", to);
          return q;
        })(),
        range(
          supabase
            .from("payments")
            .select("id, order_id, amount, payment_method, created_at, orders(order_number, created_by)")
            .order("created_at", { ascending: false })
            .limit(300),
        ),
        range(
          supabase
            .from("intake_sessions")
            .select("id, supplier_name, total_items, status, created_at, created_by, warehouses(name)")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        range(
          supabase
            .from("inventory_transfers")
            .select(
              "id, status, created_at, created_by, from_warehouse:warehouses!inventory_transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!inventory_transfers_to_warehouse_id_fkey(name)",
            )
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        range(
          supabase
            .from("inventory_log")
            .select(
              "id, quantity_change, quantity_after, created_at, created_by, action_type, product_variations(name, products(name))",
            )
            .eq("action_type", "adjustment")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        range(
          supabase
            .from("expenses")
            .select("id, description, amount, created_at, created_by")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        range(
          supabase
            .from("cash_transfers")
            .select(
              "id, amount, created_at, created_by, from_register:cash_registers!cash_transfers_from_register_id_fkey(name), to_register:cash_registers!cash_transfers_to_register_id_fkey(name)",
            )
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        range(
          supabase
            .from("documents")
            .select("id, doc_number, total, status, customer_name, created_at, order_id")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
      ]);

      const profileMap = new Map<string, string>();
      (profilesData || []).forEach((p: any) => {
        const name = p.display_name || (p.email ? String(p.email).split("@")[0] : "") || "";
        profileMap.set(p.user_id, name);
      });
      const nameOf = (uid: string | null | undefined) =>
        uid ? profileMap.get(uid) || "משתמש" : null;

      const entries: ActivityEntry[] = [];

      (ordersRes.data || []).forEach((o: any) => {
        entries.push({
          id: `order_create_${o.id}`,
          timestamp: o.created_at,
          user_id: o.created_by,
          user_name: nameOf(o.created_by),
          action_type: "order_create",
          description: `הזמנה חדשה ${o.customer_name ? `- ${o.customer_name}` : ""}`,
          reference_id: o.id,
          reference_label: `#${o.order_number}`,
          reference_link: `/crm/orders/${o.id}`,
          amount: Number(o.total) || 0,
        });
      });

      const statusLabels: Record<string, string> = {
        pending: "ממתינה",
        processing: "בטיפול",
        completed: "הושלמה",
        cancelled: "בוטלה",
      };
      (ordersUpdRes.data || []).forEach((o: any) => {
        // Only treat as update if updated_at is at least 5s after created_at
        const c = new Date(o.created_at).getTime();
        const u = new Date(o.updated_at).getTime();
        if (u - c < 5000) return;
        entries.push({
          id: `order_update_${o.id}_${o.updated_at}`,
          timestamp: o.updated_at,
          user_id: o.created_by,
          user_name: nameOf(o.created_by),
          action_type: "order_update",
          description: `עדכון הזמנה (${statusLabels[o.status] || o.status})`,
          reference_id: o.id,
          reference_label: `#${o.order_number}`,
          reference_link: `/crm/orders/${o.id}`,
        });
      });

      const pmLabels: Record<string, string> = {
        cash: "מזומן",
        credit: "אשראי",
        bit: "ביט",
        bank_transfer: "העברה בנקאית",
        digital: "תשלום דיגיטלי",
      };
      (paymentsRes.data || []).forEach((p: any) => {
        const uid = p.orders?.created_by ?? null;
        entries.push({
          id: `payment_${p.id}`,
          timestamp: p.created_at,
          user_id: uid,
          user_name: nameOf(uid),
          action_type: "payment",
          description: `תשלום ${pmLabels[p.payment_method] || p.payment_method}`,
          reference_id: p.order_id,
          reference_label: p.orders?.order_number ? `#${p.orders.order_number}` : undefined,
          reference_link: p.order_id ? `/crm/orders/${p.order_id}` : undefined,
          amount: Number(p.amount) || 0,
        });
      });

      (intakeRes.data || []).forEach((s: any) => {
        entries.push({
          id: `intake_${s.id}`,
          timestamp: s.created_at,
          user_id: s.created_by,
          user_name: nameOf(s.created_by),
          action_type: "intake",
          description: `קליטת מלאי ${s.warehouses?.name ? `→ ${s.warehouses.name}` : ""}${s.supplier_name ? ` | ספק: ${s.supplier_name}` : ""} (${s.total_items || 0} פריטים)`,
          reference_id: s.id,
          reference_link: `/crm/inventory/intake-history`,
        });
      });

      (transfersRes.data || []).forEach((t: any) => {
        entries.push({
          id: `transfer_${t.id}`,
          timestamp: t.created_at,
          user_id: t.created_by,
          user_name: nameOf(t.created_by),
          action_type: "transfer",
          description: `העברת מלאי: ${t.from_warehouse?.name || "?"} → ${t.to_warehouse?.name || "?"}`,
          reference_id: t.id,
          reference_link: `/crm/inventory/transfers`,
        });
      });

      (adjustRes.data || []).forEach((l: any) => {
        const pname =
          l.product_variations?.products?.name || l.product_variations?.name || "מוצר";
        entries.push({
          id: `adjust_${l.id}`,
          timestamp: l.created_at,
          user_id: l.created_by,
          user_name: nameOf(l.created_by),
          action_type: "adjustment",
          description: `התאמת מלאי: ${pname} (${l.quantity_change > 0 ? "+" : ""}${l.quantity_change})`,
          reference_id: l.id,
        });
      });

      (expensesRes.data || []).forEach((e: any) => {
        entries.push({
          id: `expense_${e.id}`,
          timestamp: e.created_at,
          user_id: e.created_by,
          user_name: nameOf(e.created_by),
          action_type: "expense",
          description: `הוצאה: ${e.description}`,
          reference_id: e.id,
          reference_link: `/crm/expenses`,
          amount: Number(e.amount) || 0,
        });
      });

      (cashTransfersRes.data || []).forEach((c: any) => {
        entries.push({
          id: `cash_transfer_${c.id}`,
          timestamp: c.created_at,
          user_id: c.created_by,
          user_name: nameOf(c.created_by),
          action_type: "cash_transfer",
          description: `העברה בין קופות: ${c.from_register?.name || "?"} → ${c.to_register?.name || "?"}`,
          reference_id: c.id,
          reference_link: `/crm/cash-registers`,
          amount: Number(c.amount) || 0,
        });
      });

      (documentsRes.data || []).forEach((d: any) => {
        entries.push({
          id: `document_${d.id}`,
          timestamp: d.created_at,
          user_id: null,
          user_name: null,
          action_type: "document",
          description: `הנפקת חשבונית${d.doc_number ? ` ${d.doc_number}` : ""} - ${d.customer_name}`,
          reference_id: d.order_id || d.id,
          reference_link: d.order_id ? `/crm/orders/${d.order_id}` : undefined,
          amount: Number(d.total) || 0,
        });
      });

      let result = entries;
      if (filters.userId) result = result.filter((e) => e.user_id === filters.userId);
      if (filters.actionType)
        result = result.filter((e) => e.action_type === filters.actionType);

      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return result.slice(0, 500);
    },
  });
}

export function useActivityUsers() {
  return useQuery({
    queryKey: ["activity_users"],
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("admin-list-users", { body: {} });
        const profiles = (data?.profiles || []) as Array<{ user_id: string; display_name: string | null; email?: string | null }>;
        if (profiles.length) {
          return profiles.map((p) => ({
            user_id: p.user_id,
            display_name: p.display_name || (p.email ? String(p.email).split("@")[0] : "משתמש"),
          }));
        }
      } catch {
        // fall through
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .order("display_name");
      if (error) throw error;
      return data || [];
    },
  });
}
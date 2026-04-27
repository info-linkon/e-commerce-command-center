import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCashRegisters() {
  return useQuery({
    queryKey: ["cash_registers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; opening_balance?: number }) => {
      const { error } = await supabase.from("cash_registers").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("הקופה נוספה");
    },
    onError: () => toast.error("שגיאה בהוספת קופה"),
  });
}

export function useUpdateCashRegisterBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: reg } = await supabase.from("cash_registers").select("current_balance").eq("id", id).single();
      if (!reg) throw new Error("Register not found");
      const { error } = await supabase
        .from("cash_registers")
        .update({ current_balance: Number(reg.current_balance) + amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
    },
  });
}

// Owner-only: set absolute current balance (used for "reset" / manual correction).
export function useSetCashRegisterBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current_balance }: { id: string; current_balance: number }) => {
      const { error } = await supabase
        .from("cash_registers")
        .update({ current_balance })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("היתרה עודכנה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון היתרה"),
  });
}

// Owner-only: set opening balance (the "starting amount" baseline of the register).
export function useSetCashRegisterOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, opening_balance }: { id: string; opening_balance: number }) => {
      const { error } = await supabase
        .from("cash_registers")
        .update({ opening_balance })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("יתרת הפתיחה עודכנה");
    },
    onError: (err: any) => toast.error(err?.message || "שגיאה בעדכון יתרת הפתיחה"),
  });
}

export type CashRegisterTransaction = {
  id: string;
  type: "payment" | "expense" | "transfer_in" | "transfer_out";
  amount: number; // signed: positive = in, negative = out
  description: string;
  reference: string | null;
  created_at: string;
  order_status?: string | null;
};

export function useCashRegisterTransactions(registerId: string | null) {
  return useQuery({
    queryKey: ["cash_register_transactions", registerId],
    enabled: !!registerId,
    queryFn: async () => {
      if (!registerId) return [] as CashRegisterTransaction[];

      const [payments, expenses, transfers] = await Promise.all([
        supabase
          .from("payments")
          .select("id, amount, payment_method, reference, created_at, order_id, orders(order_number, customer_name, status)")
          .eq("cash_register_id", registerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("id, amount, description, created_at")
          .eq("cash_register_id", registerId)
          .eq("payment_source", "cash_register")
          .order("created_at", { ascending: false }),
        supabase
          .from("cash_transfers")
          .select("id, amount, notes, created_at, from_register_id, to_register_id, from:cash_registers!cash_transfers_from_register_id_fkey(name), to:cash_registers!cash_transfers_to_register_id_fkey(name)")
          .or(`from_register_id.eq.${registerId},to_register_id.eq.${registerId}`)
          .order("created_at", { ascending: false }),
      ]);

      if (payments.error) throw payments.error;
      if (expenses.error) throw expenses.error;
      if (transfers.error) throw transfers.error;

      const items: CashRegisterTransaction[] = [];

      for (const p of payments.data || []) {
        const order = (p as any).orders;
        const orderLabel = order ? `הזמנה #${order.order_number}${order.customer_name ? ` — ${order.customer_name}` : ""}` : "תשלום";
        items.push({
          id: `payment-${p.id}`,
          type: "payment",
          amount: Number(p.amount),
          description: orderLabel,
          reference: p.reference,
          created_at: p.created_at,
          order_status: order?.status ?? null,
        });
      }

      for (const e of expenses.data || []) {
        items.push({
          id: `expense-${e.id}`,
          type: "expense",
          amount: -Number(e.amount),
          description: e.description,
          reference: null,
          created_at: e.created_at,
        });
      }

      for (const t of transfers.data || []) {
        const isIncoming = t.to_register_id === registerId;
        const otherName = isIncoming ? (t as any).from?.name : (t as any).to?.name;
        items.push({
          id: `transfer-${t.id}`,
          type: isIncoming ? "transfer_in" : "transfer_out",
          amount: isIncoming ? Number(t.amount) : -Number(t.amount),
          description: isIncoming ? `העברה מ-${otherName || "קופה"}` : `העברה ל-${otherName || "קופה"}`,
          reference: t.notes,
          created_at: t.created_at,
        });
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return items;
    },
  });
}

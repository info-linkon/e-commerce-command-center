import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CashClosing = {
  id: string;
  cash_register_id: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  expected_balance: number;
  counted_balance: number;
  difference: number;
  notes: string | null;
  closed_by: string | null;
  closed_at: string;
  reopened_by: string | null;
  reopened_at: string | null;
  is_open: boolean;
};

const db = supabase as any;

/** All closings (optionally for one register), newest first. */
export function useCashClosings(registerId?: string | null) {
  return useQuery({
    queryKey: ["cash_closings", registerId ?? "all"],
    queryFn: async () => {
      let q = db
        .from("cash_register_closings")
        .select("*")
        .order("period_end", { ascending: false });
      if (registerId) q = q.eq("cash_register_id", registerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CashClosing[];
    },
  });
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Latest closed closing for a register (used as the opening baseline). */
export function lastClosed(closings: CashClosing[] | undefined, registerId: string) {
  return (closings || [])
    .filter((c) => c.cash_register_id === registerId && !c.is_open)
    .sort((a, b) => (a.period_end < b.period_end ? 1 : -1))[0];
}

export type PeriodSummary = {
  opening: number;
  payments: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  expected: number;
};

/** Movements of one register between two dates (inclusive), plus expected balance. */
export function useRegisterPeriodSummary(
  registerId: string | null,
  periodStart: string | null,
  periodEnd: string | null,
) {
  return useQuery({
    queryKey: ["cash_period_summary", registerId, periodStart, periodEnd],
    enabled: !!registerId && !!periodStart && !!periodEnd,
    queryFn: async (): Promise<PeriodSummary> => {
      const fromTs = new Date(`${periodStart}T00:00:00`).toISOString();
      const toDate = new Date(`${periodEnd}T00:00:00`);
      toDate.setDate(toDate.getDate() + 1);
      const toTs = toDate.toISOString();

      const [regRes, closingRes, paymentsRes, expensesRes, transfersRes] = await Promise.all([
        db.from("cash_registers").select("opening_balance, requires_completed_order").eq("id", registerId).maybeSingle(),
        db
          .from("cash_register_closings")
          .select("counted_balance, period_end")
          .eq("cash_register_id", registerId)
          .eq("is_open", false)
          .order("period_end", { ascending: false })
          .limit(1),
        db
          .from("payments")
          .select("amount, payment_method, created_at, orders(status)")
          .eq("cash_register_id", registerId)
          .gte("created_at", fromTs)
          .lt("created_at", toTs),
        db
          .from("expenses")
          .select("amount, created_at")
          .eq("cash_register_id", registerId)
          .eq("payment_source", "cash_register")
          .gte("created_at", fromTs)
          .lt("created_at", toTs),
        db
          .from("cash_transfers")
          .select("amount, from_register_id, to_register_id, created_at")
          .or(`from_register_id.eq.${registerId},to_register_id.eq.${registerId}`)
          .gte("created_at", fromTs)
          .lt("created_at", toTs),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (transfersRes.error) throw transfersRes.error;

      const requiresCompleted = !!regRes.data?.requires_completed_order;
      const prevClosing = (closingRes.data || [])[0];
      const opening = prevClosing
        ? Number(prevClosing.counted_balance)
        : Number(regRes.data?.opening_balance || 0);

      let payments = 0;
      for (const p of paymentsRes.data || []) {
        if (requiresCompleted && p.payment_method === "cash" && p.orders?.status !== "completed") continue;
        payments += Number(p.amount);
      }
      let expenses = 0;
      for (const e of expensesRes.data || []) expenses += Number(e.amount);

      let transfersIn = 0;
      let transfersOut = 0;
      for (const t of transfersRes.data || []) {
        if (t.to_register_id === registerId) transfersIn += Number(t.amount);
        if (t.from_register_id === registerId) transfersOut += Number(t.amount);
      }

      return {
        opening,
        payments,
        expenses,
        transfersIn,
        transfersOut,
        expected: opening + payments - expenses + transfersIn - transfersOut,
      };
    },
  });
}

export function useCloseCashPeriod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      register_id: string;
      period_start: string;
      period_end: string;
      expected: number;
      counted: number;
      notes?: string;
    }) => {
      const { error } = await db.rpc("close_cash_period", {
        _register_id: input.register_id,
        _period_start: input.period_start,
        _period_end: input.period_end,
        _expected: input.expected,
        _counted: input.counted,
        _notes: input.notes || null,
        _user: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_closings"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      qc.invalidateQueries({ queryKey: ["registers-breakdown"] });
      qc.invalidateQueries({ queryKey: ["cash_period_summary"] });
      toast.success("החודש נסגר ואושר");
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("PERIOD_ALREADY_CLOSED")) toast.error("החודש הזה כבר נסגר בקופה");
      else toast.error(msg || "שגיאה בסגירת החודש");
    },
  });
}

export function useReopenCashPeriod() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (closingId: string) => {
      const { error } = await db.rpc("reopen_cash_period", {
        _closing_id: closingId,
        _user: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_closings"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      qc.invalidateQueries({ queryKey: ["registers-breakdown"] });
      toast.success("החודש נפתח מחדש");
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("NOT_ALLOWED")) toast.error("רק בעלים יכול לפתוח חודש מחדש");
      else toast.error(msg || "שגיאה בפתיחת החודש");
    },
  });
}

/** Friendly Hebrew message for the DB lock exception. */
export function isLockedPeriodError(err: any) {
  return String(err?.message || "").includes("CASH_PERIOD_LOCKED");
}

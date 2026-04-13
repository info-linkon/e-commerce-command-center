import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export function useOrderPayments(orderId?: string) {
  return useQuery({
    queryKey: ["payments", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, cash_registers(name)")
        .eq("order_id", orderId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      payments: { amount: number; payment_method: PaymentMethod; cash_register_id?: string | null; reference?: string }[];
      completeOrder?: boolean;
    }) => {
      // Validate: cash payments must have a cash register
      const cashWithoutRegister = input.payments.some(
        (p) => p.payment_method === "cash" && !p.cash_register_id
      );
      if (cashWithoutRegister) {
        throw new Error("תשלום מזומן חייב להיות משויך לקופה");
      }

      // 1. Insert all payment records
      const paymentRows = input.payments.map((p) => ({
        order_id: input.order_id,
        amount: p.amount,
        payment_method: p.payment_method,
        cash_register_id: p.cash_register_id || null,
        reference: p.reference || null,
      }));
      const { error: payErr } = await supabase.from("payments").insert(paymentRows);
      if (payErr) throw payErr;

      // 2. Update cash register balances for cash payments
      for (const p of input.payments) {
        if (p.payment_method === "cash" && p.cash_register_id) {
          const { data: reg } = await supabase
            .from("cash_registers")
            .select("current_balance")
            .eq("id", p.cash_register_id)
            .single();
          if (reg) {
            await supabase
              .from("cash_registers")
              .update({ current_balance: Number(reg.current_balance) + p.amount })
              .eq("id", p.cash_register_id);
          }
        }
      }

      // 3. Optionally mark order as completed
      if (input.completeOrder) {
        const { error: orderErr } = await supabase
          .from("orders")
          .update({ status: "completed" })
          .eq("id", input.order_id);
        if (orderErr) throw orderErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payments", vars.order_id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success(vars.completeOrder ? "התשלום נרשם וההזמנה הושלמה" : "התשלום נרשם");
    },
    onError: () => toast.error("שגיאה ברישום תשלום"),
  });
}

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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCashTransfers(registerId?: string) {
  return useQuery({
    queryKey: ["cash_transfers", registerId],
    queryFn: async () => {
      let query = supabase
        .from("cash_transfers")
        .select("*, from:cash_registers!cash_transfers_from_register_id_fkey(name), to:cash_registers!cash_transfers_to_register_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (registerId) {
        query = query.or(`from_register_id.eq.${registerId},to_register_id.eq.${registerId}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCashTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { from_register_id: string; to_register_id: string; amount: number; notes?: string }) => {
      // 1. Get balances
      const { data: fromReg } = await supabase.from("cash_registers").select("current_balance").eq("id", input.from_register_id).single();
      const { data: toReg } = await supabase.from("cash_registers").select("current_balance").eq("id", input.to_register_id).single();
      if (!fromReg || !toReg) throw new Error("קופה לא נמצאה");

      // 2. Update balances
      await supabase.from("cash_registers").update({ current_balance: Number(fromReg.current_balance) - input.amount }).eq("id", input.from_register_id);
      await supabase.from("cash_registers").update({ current_balance: Number(toReg.current_balance) + input.amount }).eq("id", input.to_register_id);

      // 3. Record transfer
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("cash_transfers").insert({
        from_register_id: input.from_register_id,
        to_register_id: input.to_register_id,
        amount: input.amount,
        notes: input.notes || null,
        created_by: userData?.user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      qc.invalidateQueries({ queryKey: ["cash_transfers"] });
      toast.success("ההעברה בוצעה בהצלחה");
    },
    onError: () => toast.error("שגיאה בהעברת כספים"),
  });
}

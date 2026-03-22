import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ExpensePaymentSource = Database["public"]["Enums"]["expense_payment_source"];

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, cash_registers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      description: string;
      amount: number;
      payment_source: ExpensePaymentSource;
      cash_register_id?: string | null;
      document_url?: string;
      document_file?: File;
    }) => {
      let fileUrl: string | null = null;

      // Upload file if provided
      if (input.document_file) {
        const ext = input.document_file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("expense-documents")
          .upload(path, input.document_file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("expense-documents")
          .getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      // 1. Insert expense
      const { error } = await supabase.from("expenses").insert({
        description: input.description,
        amount: input.amount,
        payment_source: input.payment_source,
        cash_register_id: input.cash_register_id || null,
        document_url: input.document_url || null,
        document_file: fileUrl,
      });
      if (error) throw error;

      // 2. If paid from cash register, deduct balance
      if (input.payment_source === "cash_register" && input.cash_register_id) {
        const { data: reg } = await supabase
          .from("cash_registers")
          .select("current_balance")
          .eq("id", input.cash_register_id)
          .single();
        if (reg) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(reg.current_balance) - input.amount })
            .eq("id", input.cash_register_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("ההוצאה נרשמה");
    },
    onError: () => toast.error("שגיאה ברישום הוצאה"),
  });
}

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
      created_at?: string;
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
        ...(input.created_at ? { created_at: input.created_at } : {}),
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

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      description: string;
      amount: number;
      payment_source: ExpensePaymentSource;
      cash_register_id?: string | null;
      document_url?: string | null;
      document_file?: File | null;
      remove_document?: boolean;
      created_at?: string;
    }) => {
      // Load existing expense to compute cash register delta
      const { data: existing, error: loadError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", input.id)
        .single();
      if (loadError) throw loadError;

      // Handle file: upload new if provided, else keep or remove
      let fileUrl: string | null | undefined = undefined;
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
      } else if (input.remove_document) {
        fileUrl = null;
      }

      const updatePayload: any = {
        description: input.description,
        amount: input.amount,
        payment_source: input.payment_source,
        cash_register_id: input.cash_register_id || null,
      };
      if (fileUrl !== undefined) updatePayload.document_file = fileUrl;
      if (input.created_at) updatePayload.created_at = input.created_at;

      const { error } = await supabase.from("expenses").update(updatePayload).eq("id", input.id);
      if (error) throw error;

      // Reverse old cash register effect, apply new
      const oldFromRegister =
        existing.payment_source === "cash_register" && existing.cash_register_id
          ? { register_id: existing.cash_register_id, amount: Number(existing.amount) }
          : null;
      const newFromRegister =
        input.payment_source === "cash_register" && input.cash_register_id
          ? { register_id: input.cash_register_id, amount: input.amount }
          : null;

      // Refund old
      if (oldFromRegister) {
        const { data: reg } = await supabase
          .from("cash_registers")
          .select("current_balance")
          .eq("id", oldFromRegister.register_id)
          .single();
        if (reg) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(reg.current_balance) + oldFromRegister.amount })
            .eq("id", oldFromRegister.register_id);
        }
      }
      // Deduct new
      if (newFromRegister) {
        const { data: reg } = await supabase
          .from("cash_registers")
          .select("current_balance")
          .eq("id", newFromRegister.register_id)
          .single();
        if (reg) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(reg.current_balance) - newFromRegister.amount })
            .eq("id", newFromRegister.register_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("ההוצאה עודכנה");
    },
    onError: () => toast.error("שגיאה בעדכון הוצאה"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing, error: loadError } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .single();
      if (loadError) throw loadError;

      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;

      // Refund cash register if applicable
      if (existing.payment_source === "cash_register" && existing.cash_register_id) {
        const { data: reg } = await supabase
          .from("cash_registers")
          .select("current_balance")
          .eq("id", existing.cash_register_id)
          .single();
        if (reg) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(reg.current_balance) + Number(existing.amount) })
            .eq("id", existing.cash_register_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      toast.success("ההוצאה נמחקה");
    },
    onError: () => toast.error("שגיאה במחיקת הוצאה"),
  });
}

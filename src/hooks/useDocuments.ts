import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DOC_TYPE_LABELS: Record<number, string> = {
  305: "חשבונית מס",
  320: "חשבונית מס / קבלה",
  400: "קבלה",
  200: "תעודת משלוח",
};

export { DOC_TYPE_LABELS };

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export interface CreateDocInput {
  doc_type: "tax_invoice" | "invoice_receipt" | "receipt" | "delivery_note";
  order_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: { details: string; amount: number; price: number; catalog_number?: string }[];
  payments?: { type: string; amount: number; comment?: string }[];
  description?: string;
  comment?: string;
  dont_send_email?: boolean;
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDocInput) => {
      const { data, error } = await supabase.functions.invoke("ezcount-doc", {
        body: input,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success(`מסמך ${data.doc_number || ""} הופק בהצלחה`);
    },
    onError: (err: Error) => toast.error(`שגיאה בהפקת מסמך: ${err.message}`),
  });
}

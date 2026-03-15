import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeliveryCompanies(activeOnly = false) {
  return useQuery({
    queryKey: ["delivery_companies", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("delivery_companies")
        .select("*, cash_registers(name)")
        .order("name");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDeliveryCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; is_internal?: boolean; cash_register_id?: string | null }) => {
      const { data, error } = await supabase.from("delivery_companies").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_companies"] });
      toast.success("חברת משלוח נוצרה");
    },
    onError: () => toast.error("שגיאה ביצירת חברת משלוח"),
  });
}

export function useUpdateDeliveryCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_internal?: boolean; is_active?: boolean; cash_register_id?: string | null }) => {
      const { error } = await supabase.from("delivery_companies").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_companies"] });
      toast.success("חברת משלוח עודכנה");
    },
    onError: () => toast.error("שגיאה בעדכון"),
  });
}

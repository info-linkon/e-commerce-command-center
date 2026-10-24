import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Warehouse = Tables<"warehouses">;

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Warehouse[];
    },
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (warehouse: TablesInsert<"warehouses">) => {
      const { data, error } = await supabase.from("warehouses").insert(warehouse).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("המחסן נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת מחסן"),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"warehouses"> & { id: string }) => {
      const { data, error } = await supabase.from("warehouses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("המחסן עודכן בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון מחסן"),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("המחסן נמחק בהצלחה");
    },
    onError: () => toast.error("שגיאה במחיקת מחסן"),
  });
}

/** The main warehouse every sale is assigned to (CRM setting settings/inventory.main_warehouse_id). */
export function useMainWarehouseId() {
  return useQuery({
    queryKey: ["site-content", "settings", "inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("content")
        .eq("page", "settings")
        .eq("section", "inventory")
        .maybeSingle();
      if (error) throw error;
      return ((data?.content as { main_warehouse_id?: string } | null)?.main_warehouse_id || null) as string | null;
    },
  });
}

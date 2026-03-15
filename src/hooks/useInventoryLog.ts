import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type InventoryActionType = Database["public"]["Enums"]["inventory_action_type"];

interface LogInventoryParams {
  variation_id: string;
  warehouse_id: string;
  quantity_change: number;
  quantity_after: number;
  action_type: InventoryActionType;
  reference_id?: string;
  notes?: string;
}

export async function logInventoryChange(params: LogInventoryParams) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("inventory_log").insert({
    variation_id: params.variation_id,
    warehouse_id: params.warehouse_id,
    quantity_change: params.quantity_change,
    quantity_after: params.quantity_after,
    action_type: params.action_type,
    reference_id: params.reference_id || null,
    notes: params.notes || null,
    created_by: user?.id || null,
  });
  if (error) {
    console.error("Failed to write inventory log:", error);
    throw error;
  }
}

export function useInventoryLog(filters?: {
  warehouseId?: string;
  actionType?: InventoryActionType;
  variationId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["inventory_log", filters],
    queryFn: async () => {
      let query = supabase
        .from("inventory_log")
        .select("*, product_variations(name, products(name)), warehouses(name)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters?.warehouseId) query = query.eq("warehouse_id", filters.warehouseId);
      if (filters?.actionType) query = query.eq("action_type", filters.actionType);
      if (filters?.variationId) query = query.eq("variation_id", filters.variationId);
      if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59");

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

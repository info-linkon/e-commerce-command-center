import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderCounts() {
  return useQuery({
    queryKey: ["order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      return counts;
    },
    refetchInterval: 30000,
  });
}

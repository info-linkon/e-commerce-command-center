import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIntakeSessions() {
  return useQuery({
    queryKey: ["intake_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_sessions")
        .select("*, warehouses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useIntakeSessionItems(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["intake_session_items", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intake_session_items")
        .select("*, product_variations(name, products(name))")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data;
    },
  });
}

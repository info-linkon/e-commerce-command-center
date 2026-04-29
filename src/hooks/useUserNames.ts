import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserNameEntry {
  user_id: string;
  display_name: string;
}

/**
 * Loads a global mapping of user_id -> display name for the whole CRM.
 * Tries the privileged `admin-list-users` edge function first (needs admin/owner),
 * falls back to the user's own profile if not allowed.
 * Returns a `nameOf(uid)` helper.
 */
export function useUserNames() {
  const query = useQuery({
    queryKey: ["user-names-map"],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Map<string, string>> => {
      const map = new Map<string, string>();
      try {
        const { data, error } = await supabase.functions.invoke("admin-list-users", { body: {} });
        if (!error && data?.profiles) {
          for (const p of data.profiles as Array<{ user_id: string; display_name: string | null; email?: string | null }>) {
            const name =
              (p.display_name && p.display_name.trim()) ||
              (p.email ? String(p.email).split("@")[0] : "") ||
              "";
            if (p.user_id) map.set(p.user_id, name || "משתמש");
          }
          if (map.size > 0) return map;
        }
      } catch {
        // fall through to own profile
      }

      const { data: own } = await supabase.from("profiles").select("user_id, display_name");
      for (const p of own || []) {
        if (p.user_id) map.set(p.user_id, (p.display_name || "").trim() || "משתמש");
      }
      return map;
    },
  });

  const nameOf = (uid?: string | null): string => {
    if (!uid) return "—";
    return query.data?.get(uid) || "משתמש";
  };

  return { nameOf, isLoading: query.isLoading, map: query.data };
}

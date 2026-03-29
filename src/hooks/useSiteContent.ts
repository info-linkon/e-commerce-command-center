import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSiteContent(page?: string) {
  return useQuery({
    queryKey: ["site-content", page],
    queryFn: async () => {
      let query = supabase.from("site_content").select("*");
      if (page) query = query.eq("page", page);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSiteSection(page: string, section: string) {
  return useQuery({
    queryKey: ["site-content", page, section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .eq("page", page)
        .eq("section", section)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertSiteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ page, section, content }: { page: string; section: string; content: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("site_content")
        .upsert({ page, section, content, updated_at: new Date().toISOString() }, { onConflict: "page,section" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("התוכן עודכן בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון תוכן"),
  });
}

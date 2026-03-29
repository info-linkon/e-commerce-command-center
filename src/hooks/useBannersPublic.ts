import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useBannersPublic() {
  return useQuery({
    queryKey: ["banners-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useBannersAdmin() {
  return useQuery({
    queryKey: ["banners-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banner: { title?: string; subtitle?: string; image_url?: string; link?: string; sort_order?: number; active?: boolean }) => {
      const { data, error } = await supabase.from("banners").insert(banner).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners-admin"] });
      qc.invalidateQueries({ queryKey: ["banners-public"] });
      toast.success("הבאנר נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת באנר"),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; subtitle?: string; image_url?: string; link?: string; sort_order?: number; active?: boolean }) => {
      const { data, error } = await supabase.from("banners").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners-admin"] });
      qc.invalidateQueries({ queryKey: ["banners-public"] });
      toast.success("הבאנר עודכן בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון באנר"),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banners-admin"] });
      qc.invalidateQueries({ queryKey: ["banners-public"] });
      toast.success("הבאנר נמחק בהצלחה");
    },
    onError: () => toast.error("שגיאה במחיקת באנר"),
  });
}

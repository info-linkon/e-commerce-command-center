import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketingSmsTemplate {
  id: string;
  name: string;
  body: string;
  locale: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useMarketingSmsTemplates = () =>
  useQuery({
    queryKey: ["marketing-sms-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_sms_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketingSmsTemplate[];
    },
  });

export const useSaveMarketingSmsTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: { id?: string; name: string; body: string; locale: string }) => {
      if (tpl.id) {
        const { error } = await supabase
          .from("marketing_sms_templates")
          .update({ name: tpl.name, body: tpl.body, locale: tpl.locale })
          .eq("id", tpl.id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("marketing_sms_templates").insert({
          name: tpl.name,
          body: tpl.body,
          locale: tpl.locale,
          created_by: userRes?.user?.id ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-sms-templates"] });
      toast.success("התבנית נשמרה");
    },
    onError: (e: any) => toast.error(e.message || "שגיאה בשמירת התבנית"),
  });
};

export const useDeleteMarketingSmsTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_sms_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-sms-templates"] });
      toast.success("התבנית נמחקה");
    },
    onError: (e: any) => toast.error(e.message || "שגיאה במחיקה"),
  });
};

/** Send a single SMS to one recipient */
export const useSendSingleSms = () =>
  useMutation({
    mutationFn: async (payload: { phone: string; message: string; context?: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: payload.phone,
          message: payload.message,
          event_key: "manual_sms",
          context: payload.context || {},
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "שליחה נכשלה");
      return data;
    },
    onSuccess: () => toast.success("ההודעה נשלחה"),
    onError: (e: any) => toast.error(e.message || "שגיאה בשליחת ההודעה"),
  });

export interface BulkSmsResult {
  sent: number;
  failed: number;
  skipped: number;
  details: { phone: string; name?: string | null; status: string; error?: string }[];
}

/** Send a campaign to many recipients via edge function */
export const useSendBulkSms = () =>
  useMutation({
    mutationFn: async (payload: {
      message: string;
      recipients: { phone: string; name?: string | null; customer_id?: string | null }[];
    }) => {
      const { data, error } = await supabase.functions.invoke("send-bulk-sms", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as BulkSmsResult;
    },
    onError: (e: any) => toast.error(e.message || "שגיאה בשליחת הדיוור"),
  });
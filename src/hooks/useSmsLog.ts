import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SmsLogFilters {
  search?: string;
  status?: "all" | "sent" | "failed";
  fromDate?: string; // ISO date
  toDate?: string;   // ISO date
  page?: number;
  pageSize?: number;
}

export interface SmsLogRow {
  id: string;
  channel: string;
  event_key: string;
  recipient: string;
  body: string | null;
  status: string;
  error: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  created_at: string | null;
  context: Record<string, unknown> | null;
}

export function useSmsLog(filters: SmsLogFilters = {}) {
  const {
    search = "",
    status = "all",
    fromDate,
    toDate,
    page = 0,
    pageSize = 50,
  } = filters;

  return useQuery({
    queryKey: ["sms-log", { search, status, fromDate, toDate, page, pageSize }],
    queryFn: async () => {
      let q = supabase
        .from("notification_log")
        .select("*", { count: "exact" })
        .eq("channel", "sms")
        .order("created_at", { ascending: false });

      if (status !== "all") q = q.eq("status", status);
      if (fromDate) q = q.gte("created_at", fromDate);
      if (toDate) q = q.lte("created_at", toDate);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`recipient.ilike.${s},body.ilike.${s},event_key.ilike.${s}`);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as SmsLogRow[], total: count || 0 };
    },
  });
}

export function useSmsLogStats() {
  return useQuery({
    queryKey: ["sms-log-stats"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [sent, failed, today] = await Promise.all([
        supabase
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("channel", "sms")
          .eq("status", "sent"),
        supabase
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("channel", "sms")
          .eq("status", "failed"),
        supabase
          .from("notification_log")
          .select("id", { count: "exact", head: true })
          .eq("channel", "sms")
          .gte("created_at", todayStart.toISOString()),
      ]);

      return {
        sent: sent.count || 0,
        failed: failed.count || 0,
        today: today.count || 0,
      };
    },
  });
}
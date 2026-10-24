import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ORDER_CHANNELS, orderChannelLabel, saveOrderChannel, type OrderChannel } from "@/lib/order-channel";

type TrackingContext = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;
  ttclid?: string;
  gclid?: string;
  landing_page?: string;
};

/** Human label for where a website order came from, from its click ids / UTM. */
export function websiteOriginLabel(ctx: TrackingContext | null): string {
  if (!ctx) return "לא ידוע";
  if (ctx.ttclid) return "פרסום TikTok";
  if (ctx.gclid) return "פרסום Google";
  if (ctx.fbc || ctx.fbclid) return ctx.utm_source ? `Meta (${ctx.utm_source})` : "Meta (פייסבוק / אינסטגרם)";
  if (ctx.utm_source) return ctx.utm_source;
  return "ישיר / אורגני";
}

// Order origin (client notes §7.8–7.9):
//  - website orders: campaign data captured at checkout (UTM, fbclid, ttclid,
//    gclid), stored by web-create-order as a `tracking_context` payment_event;
//  - POS / manual orders: the channel picked in the POS, editable here.
export function OrderOriginInfo({ orderId, source, channel }: { orderId: string; source: string; channel?: string | null }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: ctx, isLoading } = useQuery({
    queryKey: ["order-tracking-context", orderId],
    enabled: source === "website",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_events")
        .select("metadata")
        .eq("order_id", orderId)
        .eq("event_type", "tracking_context")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.metadata as TrackingContext | null) || null;
    },
  });

  if (source === "website") {
    if (isLoading) return null;
    const rows: [string, string | undefined][] = [
      ["קמפיין", ctx?.utm_campaign],
      ["מדיום", ctx?.utm_medium],
      ["מודעה", ctx?.utm_content],
      ["דף נחיתה", ctx?.landing_page],
    ];
    return (
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="flex gap-2 items-center">
          <span>הגיע מ:</span>
          <Badge variant="secondary" className="text-xs">{websiteOriginLabel(ctx)}</Badge>
        </div>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="text-xs break-all">
            {k}: <span className="text-foreground" dir="ltr">{v}</span>
          </div>
        ))}
        {!ctx && <div className="text-xs">אין נתוני קמפיין להזמנה זו (נאספים מהזמנות חדשות בלבד)</div>}
      </div>
    );
  }

  const change = async (value: string) => {
    setSaving(true);
    const ok = await saveOrderChannel(orderId, value as OrderChannel);
    setSaving(false);
    if (!ok) {
      toast.error("שמירת מקור ההזמנה נכשלה");
      return;
    }
    toast.success("מקור ההזמנה עודכן");
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  return (
    <div className="flex gap-2 items-center text-sm text-muted-foreground">
      <span>הגיע מ:</span>
      <Select value={channel || ""} onValueChange={change} disabled={saving} dir="rtl">
        <SelectTrigger className="h-7 w-36 text-xs" dir="rtl">
          <SelectValue placeholder="לא צוין">{orderChannelLabel(channel) || undefined}</SelectValue>
        </SelectTrigger>
        <SelectContent dir="rtl">
          {ORDER_CHANNELS.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface Props {
  startDate: string;
  endDate?: string;
}

type Outcome = "paid" | "declined" | "verify_failed" | "no_return";

const outcomeLabels: Record<Outcome, string> = {
  paid: "שולם",
  declined: "נדחה ב-HYP",
  verify_failed: "אימות נכשל",
  no_return: "לא חזר מ-HYP (עזיבה)",
};

// Website credit-card orders in the period, with what HYP reported for each
// (from payment_events written by hyp-callback / hyp-notify). Answers "why
// did these credit orders get cancelled": card declined (CCode + errMsg),
// signature/amount verification failed, or the customer never came back
// from the payment page.
export default function CreditAttemptsTab({ startDate, endDate }: Props) {
  const { data: orders } = useQuery({
    queryKey: ["report-credit-orders", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, order_number, created_at, status, total, customer_name, customer_phone, hyp_transaction_id")
        .eq("source", "website")
        .eq("payment_method", "credit")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
        .limit(500);
      if (endDate) q = q.lte("created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const orderIds = useMemo(() => (orders || []).map((o) => o.id), [orders]);

  const { data: events } = useQuery({
    queryKey: ["report-credit-events", orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_events")
        .select("order_id, event_type, success, message, created_at")
        .in("order_id", orderIds)
        .like("event_type", "hyp_%")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const byOrder = new Map<string, { event_type: string; success: boolean; message: string | null }[]>();
    for (const e of events || []) {
      if (!e.order_id) continue;
      const list = byOrder.get(e.order_id) || [];
      list.push(e);
      byOrder.set(e.order_id, list);
    }
    // Repeated attempts by the same phone number (customer retried).
    const attemptsByPhone = new Map<string, number>();
    for (const o of orders || []) {
      const phone = o.customer_phone || "";
      if (phone) attemptsByPhone.set(phone, (attemptsByPhone.get(phone) || 0) + 1);
    }
    return (orders || []).map((o) => {
      const evs = byOrder.get(o.id) || [];
      const declined = [...evs].reverse().find((e) => e.event_type === "hyp_callback_declined");
      const verifyFail = [...evs].reverse().find((e) => !e.success && e.event_type !== "hyp_callback_declined");
      let outcome: Outcome;
      let detail = "";
      if (o.hyp_transaction_id || evs.some((e) => e.success && /payment_recorded|duplicate_ignored/.test(e.message || ""))) {
        outcome = "paid";
      } else if (declined) {
        outcome = "declined";
        detail = declined.message || "";
      } else if (verifyFail) {
        outcome = "verify_failed";
        detail = `${verifyFail.event_type}: ${verifyFail.message || ""}`;
      } else {
        outcome = "no_return";
      }
      return { ...o, outcome, detail, attempts: attemptsByPhone.get(o.customer_phone || "") || 1 };
    });
  }, [orders, events]);

  const counts = useMemo(() => {
    const c: Record<Outcome, number> = { paid: 0, declined: 0, verify_failed: 0, no_return: 0 };
    for (const r of rows) c[r.outcome]++;
    return c;
  }, [rows]);

  // Most common HYP decline codes in the period.
  const topCodes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.outcome !== "declined") continue;
      const code = r.detail.match(/CCode=(\S+)/)?.[1] || "?";
      m.set(code, (m.get(code) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(outcomeLabels) as Outcome[]).map((k) => (
          <Card key={k}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{outcomeLabels[k]}</p>
              <p className="text-2xl font-bold">{counts[k]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {topCodes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>קודי דחייה של HYP</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topCodes.map(([code, n]) => (
              <Badge key={code} variant="secondary">CCode {code}: {n}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>הזמנות אשראי מהאתר ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">הזמנה</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">תוצאה</TableHead>
                <TableHead className="text-right">פירוט</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/crm/orders/${r.id}`} className="text-primary hover:underline flex items-center gap-1">
                      #{r.order_number} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("he-IL")}</TableCell>
                  <TableCell>
                    {r.customer_name}
                    {r.attempts > 1 && <span className="text-xs text-muted-foreground"> ({r.attempts} ניסיונות)</span>}
                  </TableCell>
                  <TableCell>₪{Number(r.total).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={r.outcome === "paid" ? "default" : r.outcome === "no_return" ? "outline" : "destructive"}>
                      {outcomeLabels[r.outcome]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={r.detail}>{r.detail}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">אין הזמנות אשראי בתקופה</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

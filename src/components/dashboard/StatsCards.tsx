import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StatsCardsProps {
  startDate: string;
  endDate: string;
}

const StatsCards = ({ startDate, endDate }: StatsCardsProps) => {
  const { data } = useQuery({
    queryKey: ["dashboard-stats", startDate, endDate],
    queryFn: async () => {
      const [salesOrders, payments, successEvents] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .neq("status", "cancelled"),
        supabase
          .from("payments")
          .select("amount, payment_method, reference, order_id, orders!inner(status)")
          .gte("created_at", startDate)
          .lte("created_at", endDate),
        supabase
          .from("payment_events")
          .select("order_id, event_type, success")
          .like("event_type", "hyp_verify_%")
          .eq("success", true),
      ]);

      const salesTotal = (salesOrders.data || []).reduce((s, o) => s + Number(o.total), 0);
      const ordersCount = salesOrders.data?.length || 0;

      const paymentsList = payments.data || [];
      const successOrderIds = new Set(
        (successEvents.data || []).map((e: any) => e.order_id).filter(Boolean),
      );
      const cashTotal = paymentsList
        .filter((p) => p.payment_method === "cash" && (p.orders as any)?.status === "completed")
        .reduce((s, p) => s + Number(p.amount), 0);
      // Credit counts as successful when EITHER:
      //  - a non-empty reference (e.g. HYP-<id>) is stored on the payment, OR
      //  - a successful hyp_verify_* event exists for the order (covers older
      //    rows where the reference field wasn't backfilled).
      const creditTotal = paymentsList
        .filter((p: any) => {
          if (p.payment_method !== "credit") return false;
          const hasRef = !!p.reference && String(p.reference).trim() !== "";
          const hasSuccessEvent = successOrderIds.has((p as any).order_id);
          return hasRef || hasSuccessEvent;
        })
        .reduce((s, p) => s + Number(p.amount), 0);
      const bitTotal = paymentsList
        .filter((p) => p.payment_method === "bit")
        .reduce((s, p) => s + Number(p.amount), 0);
      const totalIncome = cashTotal + creditTotal + bitTotal;

      return {
        salesTotal,
        ordersCount,
        cashTotal,
        creditTotal,
        bitTotal,
        totalIncome,
      };
    },
    refetchInterval: 30000,
  });

  const stats = [
    {
      title: "מכירות",
      value: `₪${(data?.salesTotal || 0).toFixed(0)}`,
      icon: DollarSign,
      description: `${data?.ordersCount || 0} הזמנות`,
    },
    {
      title: "כסף נכנס",
      value: `₪${(data?.totalIncome || 0).toFixed(0)}`,
      icon: TrendingUp,
      description: `מזומן ₪${(data?.cashTotal || 0).toFixed(0)} | אשראי ₪${(data?.creditTotal || 0).toFixed(0)} | ביט ₪${(data?.bitTotal || 0).toFixed(0)}`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

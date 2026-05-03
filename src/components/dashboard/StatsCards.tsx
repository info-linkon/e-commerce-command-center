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
      const [salesOrders, payments] = await Promise.all([
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
      ]);

      const salesTotal = (salesOrders.data || []).reduce((s, o) => s + Number(o.total), 0);
      const ordersCount = salesOrders.data?.length || 0;

      const paymentsList = payments.data || [];
      // "כסף נכנס" = payments on orders that were actually paid in practice
      // (i.e. not cancelled). Cash still requires the order to be completed.
      const cashTotal = paymentsList
        .filter((p: any) => p.payment_method === "cash" && p.orders?.status === "completed")
        .reduce((s, p) => s + Number(p.amount), 0);
      // Credit = all credit payments on non-cancelled orders.
      const creditTotal = paymentsList
        .filter((p: any) => p.payment_method === "credit" && p.orders?.status !== "cancelled")
        .reduce((s, p) => s + Number(p.amount), 0);
      const bitTotal = paymentsList
        .filter((p: any) => p.payment_method === "bit" && p.orders?.status !== "cancelled")
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

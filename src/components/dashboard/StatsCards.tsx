import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";
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
      const [salesOrders, pendingOrders, lowStock] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .eq("status", "completed"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("inventory")
          .select("id", { count: "exact", head: true })
          .lte("quantity", 5)
          .gt("quantity", -1),
      ]);

      const salesTotal = (salesOrders.data || []).reduce((s, o) => s + Number(o.total), 0);
      const ordersCount = salesOrders.data?.length || 0;

      return {
        salesTotal,
        ordersCount,
        pendingCount: pendingOrders.count || 0,
        lowStockCount: lowStock.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  const stats = [
    { title: "מכירות", value: `₪${(data?.salesTotal || 0).toFixed(0)}`, icon: DollarSign, description: "סה״כ מכירות בתקופה" },
    { title: "הזמנות שהושלמו", value: String(data?.ordersCount || 0), icon: TrendingUp, description: "הזמנות שהושלמו בתקופה" },
    { title: "הזמנות ממתינות", value: String(data?.pendingCount || 0), icon: ShoppingCart, description: "הזמנות בהמתנה" },
    { title: "מלאי נמוך", value: String(data?.lowStockCount || 0), icon: Package, description: "פריטים מתחת לסף" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

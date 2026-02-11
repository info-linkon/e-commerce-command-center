import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const StatsCards = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [ordersToday, pendingOrders, lowStock, monthOrders] = await Promise.all([
        supabase.from("orders").select("total").gte("created_at", today.toISOString()).eq("status", "completed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("inventory").select("id", { count: "exact", head: true }).lte("quantity", 5).gt("quantity", -1),
        supabase.from("orders").select("total").gte("created_at", monthStart.toISOString()).eq("status", "completed"),
      ]);

      const salesToday = (ordersToday.data || []).reduce((s, o) => s + Number(o.total), 0);
      const monthTotal = (monthOrders.data || []).reduce((s, o) => s + Number(o.total), 0);

      return {
        salesToday,
        pendingCount: pendingOrders.count || 0,
        lowStockCount: lowStock.count || 0,
        monthTotal,
      };
    },
    refetchInterval: 30000,
  });

  const stats = [
    { title: "מכירות היום", value: `₪${(data?.salesToday || 0).toFixed(0)}`, icon: DollarSign, description: "סה״כ מכירות היום" },
    { title: "הזמנות ממתינות", value: String(data?.pendingCount || 0), icon: ShoppingCart, description: "הזמנות בהמתנה" },
    { title: "מלאי נמוך", value: String(data?.lowStockCount || 0), icon: Package, description: "פריטים מתחת לסף" },
    { title: "הכנסות החודש", value: `₪${(data?.monthTotal || 0).toFixed(0)}`, icon: TrendingUp, description: "סה״כ הכנסות החודש" },
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

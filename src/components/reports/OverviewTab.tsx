import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface Props {
  startDate: string;
  endDate?: string;
}

export default function OverviewTab({ startDate, endDate }: Props) {
  const { data: registers } = useCashRegisters();

  const { data: salesData } = useQuery({
    queryKey: ["report-overview-sales", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("total, created_at")
        .gte("created_at", startDate)
        .eq("status", "completed")
        .order("created_at");
      if (endDate) q = q.lte("created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      const byDate: Record<string, number> = {};
      for (const o of data || []) {
        const date = new Date(o.created_at).toLocaleDateString("he-IL");
        byDate[date] = (byDate[date] || 0) + Number(o.total);
      }
      return { total: data?.reduce((s, o) => s + Number(o.total), 0) || 0, byDate: Object.entries(byDate).map(([date, total]) => ({ date, total })) };
    },
  });

  const { data: expensesTotal } = useQuery({
    queryKey: ["report-overview-expenses", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select("amount")
        .gte("created_at", startDate);
      if (endDate) q = q.lte("created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data?.reduce((s, e) => s + Number(e.amount), 0) || 0;
    },
  });

  const { data: profitByDate } = useQuery({
    queryKey: ["report-overview-profit", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, product_variations(cost_price), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (endDate) q = q.lte("orders.created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      const byDate: Record<string, { revenue: number; cost: number }> = {};
      for (const item of data || []) {
        const order = item.orders as any;
        const revenue = Number(item.total_price);
        const cost = Number((item.product_variations as any)?.cost_price || 0) * item.quantity;
        const date = new Date(order?.created_at).toLocaleDateString("he-IL");
        if (!byDate[date]) byDate[date] = { revenue: 0, cost: 0 };
        byDate[date].revenue += revenue;
        byDate[date].cost += cost;
      }
      return Object.entries(byDate).map(([date, d]) => ({ date, ...d, profit: d.revenue - d.cost }));
    },
  });

  const totalRegisters = useMemo(() => registers?.reduce((s, r) => s + Number(r.current_balance), 0) || 0, [registers]);
  const totalSales = salesData?.total || 0;
  const totalExpenses = expensesTotal || 0;
  const netProfit = totalSales - totalExpenses;

  const summaryCards = [
    { label: "סה״כ מכירות", value: `₪${totalSales.toFixed(0)}`, icon: DollarSign, color: "text-green-600" },
    { label: "סה״כ הוצאות", value: `₪${totalExpenses.toFixed(0)}`, icon: TrendingDown, color: "text-red-500" },
    { label: "רווח נקי", value: `₪${netProfit.toFixed(0)}`, icon: TrendingUp, color: netProfit >= 0 ? "text-green-600" : "text-red-500" },
    { label: "יתרת קופות", value: `₪${totalRegisters.toFixed(0)}`, icon: Wallet, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between">
            <Badge variant="secondary" className="text-lg">₪{totalSales.toFixed(0)}</Badge>
            <span>מכירות לפי תאריך</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData?.byDate || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(v) => [`₪${v}`, "מכירות"]} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>רווחיות לפי תאריך</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitByDate || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(v: number, name: string) => [`₪${v.toFixed(0)}`, name === "revenue" ? "הכנסות" : name === "cost" ? "עלות" : "רווח"]} />
              <Bar dataKey="revenue" name="הכנסות" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="עלות" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="רווח" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories } = useQuery({
    queryKey: ["report-overview-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_he")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["report-overview-sales", startDate, endDate, categoryId],
    queryFn: async () => {
      // When a category is selected we have to derive sales from order_items
      // (so we can keep only lines whose product is in that category).
      // Otherwise sum order totals directly — much cheaper.
      if (categoryId === "all") {
        let q = supabase
          .from("orders")
          .select("total, created_at")
          .gte("created_at", startDate)
          .not("status", "in", "(cancelled,unfulfilled,external_unfulfilled)")
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
      }
      let q = supabase
        .from("order_items")
        .select("total_price, product_variations!inner(products!inner(category_id)), orders!inner(created_at, status)")
        .gte("orders.created_at", startDate)
        .not("orders.status", "in", "(cancelled,unfulfilled,external_unfulfilled)")
        .eq("product_variations.products.category_id", categoryId);
      if (endDate) q = q.lte("orders.created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      const byDate: Record<string, number> = {};
      let total = 0;
      for (const it of data || []) {
        const o = (it as any).orders;
        if (!(it as any).product_variations?.products) continue;
        const date = new Date(o.created_at).toLocaleDateString("he-IL");
        const amt = Number((it as any).total_price);
        byDate[date] = (byDate[date] || 0) + amt;
        total += amt;
      }
      return { total, byDate: Object.entries(byDate).map(([date, total]) => ({ date, total })) };
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
    queryKey: ["report-overview-profit", startDate, endDate, categoryId],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, product_variations!inner(cost_price, products!inner(category_id)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .not("orders.status", "in", "(cancelled,unfulfilled,external_unfulfilled)");
      if (endDate) q = q.lte("orders.created_at", endDate);
      if (categoryId !== "all") q = q.eq("product_variations.products.category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      const byDate: Record<string, { revenue: number; cost: number }> = {};
      for (const item of data || []) {
        if (categoryId !== "all" && !((item as any).product_variations?.products)) continue;
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
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="קטגוריה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {(categories || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name_he || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
              <YAxis orientation="right" />
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
              <YAxis orientation="right" />
              <Tooltip formatter={(v: number, name: string) => [`₪${v.toFixed(0)}`, name]} />
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

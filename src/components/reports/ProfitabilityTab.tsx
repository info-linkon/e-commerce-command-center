import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  startDate: string;
  endDate?: string;
}

export default function ProfitabilityTab({ startDate, endDate }: Props) {
  const { data: profitData } = useQuery({
    queryKey: ["report-profitability", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, product_variations(cost_price, name, products(name)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (endDate) q = q.lte("orders.created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;

      let totalRevenue = 0, totalCost = 0;
      const byDate: Record<string, { revenue: number; cost: number }> = {};
      const byProduct: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};

      for (const item of data || []) {
        const v = item.product_variations as any;
        const order = item.orders as any;
        const revenue = Number(item.total_price);
        const cost = Number(v?.cost_price || 0) * item.quantity;
        totalRevenue += revenue;
        totalCost += cost;

        const date = new Date(order?.created_at).toLocaleDateString("he-IL");
        if (!byDate[date]) byDate[date] = { revenue: 0, cost: 0 };
        byDate[date].revenue += revenue;
        byDate[date].cost += cost;

        const key = v?.products?.name || "לא ידוע";
        if (!byProduct[key]) byProduct[key] = { name: key, quantity: 0, revenue: 0, cost: 0 };
        byProduct[key].quantity += item.quantity;
        byProduct[key].revenue += revenue;
        byProduct[key].cost += cost;
      }

      let expQ = supabase.from("expenses").select("amount").gte("created_at", startDate);
      if (endDate) expQ = expQ.lte("created_at", endDate);
      const { data: expData } = await expQ;
      const totalExpenses = expData?.reduce((s, e) => s + Number(e.amount), 0) || 0;

      return {
        totalRevenue, totalCost, totalExpenses,
        totalProfit: totalRevenue - totalCost,
        netProfit: totalRevenue - totalCost - totalExpenses,
        marginPercent: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        byDate: Object.entries(byDate).map(([date, d]) => ({ date, ...d, profit: d.revenue - d.cost })),
        byProduct: Object.values(byProduct)
          .map((p) => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
          .sort((a, b) => b.profit - a.profit),
      };
    },
  });

  if (!profitData) return <p className="text-center py-8 text-muted-foreground">טוען...</p>;

  const cards = [
    { label: "הכנסות", value: `₪${profitData.totalRevenue.toFixed(0)}` },
    { label: "עלות סחורה", value: `₪${profitData.totalCost.toFixed(0)}` },
    { label: "הוצאות תפעוליות", value: `₪${profitData.totalExpenses.toFixed(0)}` },
    { label: "רווח גולמי", value: `₪${profitData.totalProfit.toFixed(0)}` },
    { label: "רווח נקי", value: `₪${profitData.netProfit.toFixed(0)}` },
    { label: "אחוז רווחיות", value: `${profitData.marginPercent.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>רווחיות לפי תאריך</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={profitData.byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(v: number, name: string) => [`₪${v.toFixed(0)}`, name === "revenue" ? "הכנסות" : name === "cost" ? "עלות" : "רווח"]} />
              <Legend />
              <Bar dataKey="revenue" name="הכנסות" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cost" name="עלות" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="רווח" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>רווחיות לפי מוצר</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מוצר</TableHead>
                <TableHead className="text-right">כמות</TableHead>
                <TableHead className="text-right">הכנסות</TableHead>
                <TableHead className="text-right">עלות</TableHead>
                <TableHead className="text-right">רווח</TableHead>
                <TableHead className="text-right">% רווח</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profitData.byProduct.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>₪{p.revenue.toFixed(0)}</TableCell>
                  <TableCell>₪{p.cost.toFixed(0)}</TableCell>
                  <TableCell className={p.profit >= 0 ? "text-green-600" : "text-red-500"}>₪{p.profit.toFixed(0)}</TableCell>
                  <TableCell>
                    <Badge variant={p.margin >= 20 ? "default" : p.margin >= 0 ? "secondary" : "destructive"}>
                      {p.margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

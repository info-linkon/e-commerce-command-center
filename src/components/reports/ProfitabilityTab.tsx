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

const VAT_RATE = 0.17;

export default function ProfitabilityTab({ startDate, endDate }: Props) {
  const { data: profitData } = useQuery({
    queryKey: ["report-profitability", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, bundle_variation_id, product_variations(cost_price, name, products(name, name_ar)), orders!inner(status, created_at, includes_vat)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (endDate) q = q.lte("orders.created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;

      // Pre-fetch bundle component costs for any bundle_variation_id referenced
      const bundleVarIds = Array.from(
        new Set(
          (data || [])
            .map((it: any) => it.bundle_variation_id)
            .filter((x: any): x is string => !!x),
        ),
      );
      const bundleCostMap = new Map<string, number>();
      if (bundleVarIds.length > 0) {
        const { data: bvItems } = await supabase
          .from("bundle_variation_items")
          .select("bundle_variation_id, quantity, product_variations(cost_price)")
          .in("bundle_variation_id", bundleVarIds);
        for (const row of bvItems || []) {
          const bvId = (row as any).bundle_variation_id as string;
          const compCost = Number((row as any).product_variations?.cost_price || 0);
          const qty = Number((row as any).quantity || 0);
          bundleCostMap.set(bvId, (bundleCostMap.get(bvId) || 0) + compCost * qty);
        }
      }

      let totalRevenueGross = 0;
      let totalCost = 0;
      const byDate: Record<string, { dateKey: string; dateLabel: string; revenue: number; cost: number }> = {};
      const byProduct: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};

      for (const item of data || []) {
        const v = item.product_variations as any;
        const order = item.orders as any;
        const grossLine = Number(item.total_price);
        const includesVat = order?.includes_vat !== false; // default true
        const revenueNet = includesVat ? grossLine / (1 + VAT_RATE) : grossLine;
        // Bundle: use component costs. Otherwise: variation cost.
        const bvId = (item as any).bundle_variation_id as string | null;
        const perUnitCost = bvId
          ? (bundleCostMap.get(bvId) || 0)
          : Number(v?.cost_price || 0);
        const cost = perUnitCost * item.quantity;
        totalRevenueGross += grossLine;
        totalCost += cost;

        const d = new Date(order?.created_at);
        const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD for sortable
        const dateLabel = d.toLocaleDateString("he-IL");
        if (!byDate[dateKey]) byDate[dateKey] = { dateKey, dateLabel, revenue: 0, cost: 0 };
        byDate[dateKey].revenue += revenueNet;
        byDate[dateKey].cost += cost;

        const key = v?.products?.name_ar || v?.products?.name || "לא ידוע";
        if (!byProduct[key]) byProduct[key] = { name: key, quantity: 0, revenue: 0, cost: 0 };
        byProduct[key].quantity += item.quantity;
        byProduct[key].revenue += revenueNet;
        byProduct[key].cost += cost;
      }

      let expQ = supabase.from("expenses").select("amount").gte("created_at", startDate);
      if (endDate) expQ = expQ.lte("created_at", endDate);
      const { data: expData } = await expQ;
      const totalExpenses = expData?.reduce((s, e) => s + Number(e.amount), 0) || 0;

      const totalVat = totalRevenueGross - (totalRevenueGross / (1 + VAT_RATE));
      // Approximation: assume all completed orders include VAT (matches default).
      // For a more accurate split we'd need per-order revenueNet — already computed above.
      // Use sum of byProduct revenues which is already net.
      const totalRevenueNet = Object.values(byProduct).reduce((s, p) => s + p.revenue, 0);
      const vatAmount = totalRevenueGross - totalRevenueNet;

      return {
        totalRevenueGross,
        vatAmount,
        totalRevenueNet,
        totalCost,
        totalExpenses,
        totalProfit: totalRevenueNet - totalCost,
        netProfit: totalRevenueNet - totalCost - totalExpenses,
        marginPercent: totalRevenueNet > 0 ? ((totalRevenueNet - totalCost) / totalRevenueNet) * 100 : 0,
        byDate: Object.values(byDate)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
          .map((d) => ({ date: d.dateLabel, revenue: d.revenue, cost: d.cost, profit: d.revenue - d.cost })),
        byProduct: Object.values(byProduct)
          .map((p) => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
          .sort((a, b) => b.profit - a.profit),
      };
    },
  });

  if (!profitData) return <p className="text-center py-8 text-muted-foreground">טוען...</p>;

  const cards = [
    { label: "הכנסות ברוטו", value: `₪${profitData.totalRevenueGross.toFixed(0)}` },
    { label: "מע״מ (17%)", value: `₪${profitData.vatAmount.toFixed(0)}` },
    { label: "הכנסות נטו", value: `₪${profitData.totalRevenueNet.toFixed(0)}` },
    { label: "עלות סחורה", value: `₪${profitData.totalCost.toFixed(0)}` },
    { label: "הוצאות תפעוליות", value: `₪${profitData.totalExpenses.toFixed(0)}` },
    { label: "רווח גולמי", value: `₪${profitData.totalProfit.toFixed(0)}` },
    { label: "רווח נקי", value: `₪${profitData.netProfit.toFixed(0)}` },
    { label: "אחוז רווחיות", value: `${profitData.marginPercent.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-6" dir="rtl">
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
              <YAxis orientation="right" />
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

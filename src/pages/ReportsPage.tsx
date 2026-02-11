import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#e2a308", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4"];

type ReportType = "sales" | "inventory" | "top-products" | "payments" | "profitability";

const ReportsPage = () => {
  const [report, setReport] = useState<ReportType>("sales");
  const [period, setPeriod] = useState("30");

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  // Sales data
  const { data: salesData } = useQuery({
    queryKey: ["report-sales", period],
    enabled: report === "sales",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at, status")
        .gte("created_at", startDate)
        .eq("status", "completed")
        .order("created_at");
      if (error) throw error;

      // Group by date
      const byDate: Record<string, number> = {};
      for (const o of data || []) {
        const date = new Date(o.created_at).toLocaleDateString("he-IL");
        byDate[date] = (byDate[date] || 0) + Number(o.total);
      }
      return Object.entries(byDate).map(([date, total]) => ({ date, total }));
    },
  });

  // Top products
  const { data: topProducts } = useQuery({
    queryKey: ["report-top-products", period],
    enabled: report === "top-products",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, total_price, product_variations(name, products(name)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (error) throw error;

      const byProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};
      for (const item of data || []) {
        const v = item.product_variations as any;
        const key = v?.products?.name || "לא ידוע";
        if (!byProduct[key]) byProduct[key] = { name: key, quantity: 0, revenue: 0 };
        byProduct[key].quantity += item.quantity;
        byProduct[key].revenue += Number(item.total_price);
      }
      return Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    },
  });

  // Inventory report
  const { data: inventoryData } = useQuery({
    queryKey: ["report-inventory"],
    enabled: report === "inventory",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("quantity, product_variations(name, products(name, category_id, categories(name))), warehouses(name)")
        .order("quantity", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Payments breakdown
  const { data: paymentsData } = useQuery({
    queryKey: ["report-payments", period],
    enabled: report === "payments",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("payment_method, amount, created_at")
        .gte("created_at", startDate);
      if (error) throw error;

      const byMethod: Record<string, number> = {};
      for (const p of data || []) {
        const method = p.payment_method === "cash" ? "מזומן" : p.payment_method === "bit" ? "ביט" : "אשראי";
        byMethod[method] = (byMethod[method] || 0) + Number(p.amount);
      }
      return Object.entries(byMethod).map(([name, value]) => ({ name, value }));
    },
  });

  // Profitability data
  const { data: profitData } = useQuery({
    queryKey: ["report-profitability", period],
    enabled: report === "profitability",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, total_price, unit_price, product_variations(cost_price, name, products(name)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (error) throw error;

      let totalRevenue = 0;
      let totalCost = 0;
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

      return {
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        marginPercent: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        byDate: Object.entries(byDate).map(([date, d]) => ({ date, ...d, profit: d.revenue - d.cost })),
        byProduct: Object.values(byProduct)
          .map((p) => ({ ...p, profit: p.revenue - p.cost, margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0 }))
          .sort((a, b) => b.profit - a.profit),
      };
    },
  });

  const totalSales = useMemo(() => salesData?.reduce((s, d) => s + d.total, 0) || 0, [salesData]);
  const totalInventory = useMemo(() => inventoryData?.reduce((s, i) => s + i.quantity, 0) || 0, [inventoryData]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold">דוחות</h1>
        <div className="flex gap-2">
          <Select value={report} onValueChange={(v) => setReport(v as ReportType)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">דוח מכירות</SelectItem>
              <SelectItem value="top-products">מוצרים מובילים</SelectItem>
              <SelectItem value="inventory">דוח מלאי</SelectItem>
              <SelectItem value="payments">התפלגות תשלומים</SelectItem>
              <SelectItem value="profitability">דוח רווחיות</SelectItem>
            </SelectContent>
          </Select>
          {report !== "inventory" && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ימים</SelectItem>
                <SelectItem value="30">30 יום</SelectItem>
                <SelectItem value="90">90 יום</SelectItem>
                <SelectItem value="365">שנה</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {report === "sales" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <Badge variant="secondary" className="text-lg">₪{totalSales.toFixed(0)}</Badge>
                <span>מכירות לפי תאריך</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(v) => [`₪${v}`, "מכירות"]} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {report === "top-products" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>מוצרים מובילים - הכנסות</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topProducts || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                  <Tooltip formatter={(v) => [`₪${v}`, "הכנסות"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>טבלת מוצרים מובילים</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מוצר</TableHead>
                    <TableHead className="text-right">כמות נמכרה</TableHead>
                    <TableHead className="text-right">הכנסות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(topProducts || []).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>₪{p.revenue.toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {report === "inventory" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <Badge variant="secondary">{totalInventory} יחידות</Badge>
              <span>דוח מלאי</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">וריאציה</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">מחסן</TableHead>
                  <TableHead className="text-right">כמות</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inventoryData || []).map((item, i) => {
                  const v = item.product_variations as any;
                  const w = item.warehouses as any;
                  const isLow = item.quantity <= 5;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{v?.products?.name || "—"}</TableCell>
                      <TableCell>{v?.name || "—"}</TableCell>
                      <TableCell>{v?.products?.categories?.name || "—"}</TableCell>
                      <TableCell>{w?.name || "—"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive">נמוך</Badge>
                        ) : (
                          <Badge variant="secondary">תקין</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {report === "payments" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>התפלגות אמצעי תשלום</CardTitle></CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie data={paymentsData || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {(paymentsData || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`₪${v}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>סיכום תשלומים</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(paymentsData || []).map((p, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-lg font-bold">₪{p.value.toFixed(0)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {report === "profitability" && profitData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "הכנסות", value: `₪${profitData.totalRevenue.toFixed(0)}` },
              { label: "עלות", value: `₪${profitData.totalCost.toFixed(0)}` },
              { label: "רווח גולמי", value: `₪${profitData.totalProfit.toFixed(0)}` },
              { label: "אחוז רווחיות", value: `${profitData.marginPercent.toFixed(1)}%` },
            ].map((s) => (
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
                  <Tooltip formatter={(v: number) => [`₪${v.toFixed(0)}`, ""]} />
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
      )}
    </div>
  );
};

export default ReportsPage;

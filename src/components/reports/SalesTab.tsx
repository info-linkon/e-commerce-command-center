import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface Props {
  startDate: string;
}

export default function SalesTab({ startDate }: Props) {
  const { data: orders } = useQuery({
    queryKey: ["report-sales-orders", startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status, customer_name, source")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["report-top-products", startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, total_price, product_variations(cost_price, name, products(name)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (error) throw error;
      const byProduct: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};
      for (const item of data || []) {
        const v = item.product_variations as any;
        const key = v?.products?.name || "לא ידוע";
        if (!byProduct[key]) byProduct[key] = { name: key, quantity: 0, revenue: 0, cost: 0 };
        byProduct[key].quantity += item.quantity;
        byProduct[key].revenue += Number(item.total_price);
        byProduct[key].cost += Number(v?.cost_price || 0) * item.quantity;
      }
      return Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    },
  });

  const statusLabels: Record<string, string> = { pending: "ממתין", processing: "בטיפול", completed: "הושלם", cancelled: "בוטל" };
  const sourceLabels: Record<string, string> = { manual: "ידני", pos: "קופה", website: "אתר" };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>מוצרים מובילים - הכנסות</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                  <TableHead className="text-right">כמות</TableHead>
                  <TableHead className="text-right">הכנסות</TableHead>
                  <TableHead className="text-right">רווח</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topProducts || []).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>₪{p.revenue.toFixed(0)}</TableCell>
                    <TableCell className={p.revenue - p.cost >= 0 ? "text-green-600" : "text-red-500"}>
                      ₪{(p.revenue - p.cost).toFixed(0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>הזמנות בתקופה</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מס׳</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">מקור</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders || []).map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link to={`/crm/orders/${o.id}`} className="text-primary hover:underline flex items-center gap-1">
                      #{o.order_number} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell>{o.customer_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{sourceLabels[o.source] || o.source}</Badge></TableCell>
                  <TableCell className="font-medium">₪{Number(o.total).toFixed(0)}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "completed" ? "default" : o.status === "cancelled" ? "destructive" : "secondary"}>
                      {statusLabels[o.status] || o.status}
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

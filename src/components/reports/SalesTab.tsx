import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ExternalLink, Download } from "lucide-react";

interface Props {
  startDate: string;
  endDate?: string;
}

export default function SalesTab({ startDate, endDate }: Props) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "quantity" | "profit">("revenue");

  const { data: categories } = useQuery({
    queryKey: ["report-sales-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, name_he")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["report-sales-orders", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, order_number, total, created_at, status, customer_name, source")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
        .limit(200);
      if (endDate) q = q.lte("created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: allProducts } = useQuery({
    queryKey: ["report-products-full", startDate, endDate, categoryId],
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, product_variations(cost_price, name, products!inner(id, product_number, name, name_ar, category_id)), orders!inner(status, created_at)")
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (endDate) q = q.lte("orders.created_at", endDate);
      if (categoryId !== "all") q = q.eq("product_variations.products.category_id", categoryId);
      const { data, error } = await q;
      if (error) throw error;
      const byProduct: Record<string, { id?: string; productNumber?: number; name: string; quantity: number; revenue: number; cost: number }> = {};
      for (const item of data || []) {
        const v = item.product_variations as any;
        const p = v?.products;
        if (!p) continue; // filtered out by category
        const key = p.id || p.name || "לא ידוע";
        if (!byProduct[key]) byProduct[key] = { id: p.id, productNumber: p.product_number, name: p.name_ar || p.name || "לא ידוע", quantity: 0, revenue: 0, cost: 0 };
        byProduct[key].quantity += item.quantity;
        byProduct[key].revenue += Number(item.total_price);
        byProduct[key].cost += Number(v?.cost_price || 0) * item.quantity;
      }
      return Object.values(byProduct);
    },
  });

  const filteredSorted = useMemo(() => {
    const arr = (allProducts || []).filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()),
    );
    const sorted = arr.sort((a, b) => {
      if (sortBy === "quantity") return b.quantity - a.quantity;
      if (sortBy === "profit") return (b.revenue - b.cost) - (a.revenue - a.cost);
      return b.revenue - a.revenue;
    });
    return sorted;
  }, [allProducts, search, sortBy]);

  const topChart = filteredSorted.slice(0, 10);

  const exportCsv = () => {
    const headers = ["מוצר", "כמות", "הכנסות", "עלות", "רווח"];
    const rows = filteredSorted.map((p) => [p.name, p.quantity, p.revenue.toFixed(2), p.cost.toFixed(2), (p.revenue - p.cost).toFixed(2)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-by-product-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabels: Record<string, string> = { pending: "ממתין", processing: "בטיפול", completed: "הושלם", cancelled: "בוטל", unfulfilled: "לא מומשה" };
  const sourceLabels: Record<string, string> = { manual: "ידני", pos: "קופה", website: "אתר" };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="קטגוריה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {(categories || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name_he || c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="חיפוש מוצר..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">לפי הכנסות</SelectItem>
              <SelectItem value="quantity">לפי כמות</SelectItem>
              <SelectItem value="profit">לפי רווח</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1 mr-auto">
            <Download className="h-4 w-4" /> ייצוא CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>10 מוצרים מובילים - הכנסות</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} orientation="right" />
                <Tooltip formatter={(v) => [`₪${v}`, "הכנסות"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>ביצועי מוצרים ({filteredSorted.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
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
                {filteredSorted.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">אין נתונים</TableCell></TableRow>
                )}
                {filteredSorted.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {p.productNumber ? (
                        <Link to={`/crm/inventory/products/${p.productNumber}`} className="text-primary hover:underline">{p.name}</Link>
                      ) : p.name}
                    </TableCell>
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

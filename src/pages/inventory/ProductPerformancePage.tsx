import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, CalendarIcon, Download, ExternalLink, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";

const VAT_RATE = 0.18;

const ProductPerformancePage = () => {
  const { id } = useParams<{ id: string }>();
  const [period, setPeriod] = useState("365");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const startDate = useMemo(() => {
    if (period === "custom") {
      if (fromDate) return fromDate.toISOString();
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    const now = new Date();
    if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d.toISOString(); }
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (period === "all") return new Date(2020, 0, 1).toISOString();
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period, fromDate]);

  const endDate = useMemo(() => {
    if (period === "custom" && toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      return end.toISOString();
    }
    return undefined;
  }, [period, toDate]);

  const { data: product } = useQuery({
    queryKey: ["product-perf-meta", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, name_ar, sku, product_number, image_url, category_id, cost_price, categories!products_category_id_fkey(name, name_he)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: perf } = useQuery({
    queryKey: ["product-perf", id, startDate, endDate],
    enabled: !!id && !!product,
    queryFn: async () => {
      let q = supabase
        .from("order_items")
        .select("quantity, total_price, variation_id, product_variations!inner(id, name, cost_price, product_id), orders!inner(id, order_number, status, created_at, customer_name, includes_vat)")
        .eq("product_variations.product_id", id!)
        .gte("orders.created_at", startDate)
        .eq("orders.status", "completed");
      if (endDate) q = q.lte("orders.created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;

      // Also count sales where this product appears as a component inside bundles.
      // We first find all bundle_variation_items whose variation belongs to this product,
      // then load order_items whose bundle_variation_id matches — multiplying quantities
      // by the per-bundle component quantity.
      const productCostFallback = Number((product as any)?.cost_price || 0);
      // Load product variations to identify component memberships
      const { data: myVars } = await supabase
        .from("product_variations")
        .select("id")
        .eq("product_id", id!);
      const myVarIds = (myVars || []).map((v: any) => v.id);
      let bundleLines: any[] = [];
      const bundleQtyByBv = new Map<string, { compQty: number; varId: string; varCost: number; varName: string }>();
      if (myVarIds.length > 0) {
        const { data: bvis } = await supabase
          .from("bundle_variation_items")
          .select("bundle_variation_id, variation_id, quantity, product_variations!inner(id, name, cost_price, product_id)")
          .in("variation_id", myVarIds);
        for (const bvi of bvis || []) {
          const pv = (bvi as any).product_variations;
          bundleQtyByBv.set((bvi as any).bundle_variation_id, {
            compQty: Number((bvi as any).quantity || 0),
            varId: pv?.id,
            varCost: Number(pv?.cost_price || 0),
            varName: pv?.name || "ברירת מחדל",
          });
        }
        const bvIds = [...bundleQtyByBv.keys()];
        if (bvIds.length > 0) {
          let bq = supabase
            .from("order_items")
            .select("quantity, total_price, bundle_variation_id, orders!inner(id, order_number, status, created_at, customer_name, includes_vat)")
            .in("bundle_variation_id", bvIds)
            .gte("orders.created_at", startDate)
            .eq("orders.status", "completed");
          if (endDate) bq = bq.lte("orders.created_at", endDate);
          const { data: br } = await bq;
          bundleLines = br || [];
        }
      }

      let quantity = 0;
      let revenueGross = 0;
      let revenueNet = 0;
      let cost = 0;
      const orderIds = new Set<string>();
      const byVariation: Record<string, { name: string; quantity: number; revenue: number; cost: number }> = {};
      const byMonth: Record<string, { month: string; quantity: number; revenue: number; profit: number }> = {};
      const orders: { id: string; order_number: number; created_at: string; customer_name: string | null; quantity: number; revenue: number }[] = [];

      for (const it of data || []) {
        const v = (it as any).product_variations;
        const o = (it as any).orders;
        const qty = Number(it.quantity);
        const gross = Number(it.total_price);
        const includesVat = o?.includes_vat !== false;
        const net = includesVat ? gross / (1 + VAT_RATE) : gross;
        const perUnitCost = Number(v?.cost_price || 0) > 0 ? Number(v?.cost_price || 0) : productCostFallback;
        const lineCost = perUnitCost * qty;

        quantity += qty;
        revenueGross += gross;
        revenueNet += net;
        cost += lineCost;
        orderIds.add(o.id);

        const vKey = v?.id || "default";
        if (!byVariation[vKey]) byVariation[vKey] = { name: v?.name || "ברירת מחדל", quantity: 0, revenue: 0, cost: 0 };
        byVariation[vKey].quantity += qty;
        byVariation[vKey].revenue += net;
        byVariation[vKey].cost += lineCost;

        const d = new Date(o.created_at);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[mKey]) byMonth[mKey] = { month: mKey, quantity: 0, revenue: 0, profit: 0 };
        byMonth[mKey].quantity += qty;
        byMonth[mKey].revenue += net;
        byMonth[mKey].profit += net - lineCost;

        orders.push({
          id: o.id, order_number: o.order_number, created_at: o.created_at,
          customer_name: o.customer_name, quantity: qty, revenue: gross,
        });
      }

      // Merge in bundle-line contributions. The product's component qty per order
      // = order_item.quantity * component quantity inside the bundle variation.
      // Revenue is intentionally set to 0 here — the bundle's revenue is booked
      // against the parent bundle product; we only count units and cost so the
      // component's true throughput is visible.
      let bundleUnits = 0;
      let bundleCost = 0;
      for (const bl of bundleLines) {
        const bvId = (bl as any).bundle_variation_id as string;
        const info = bundleQtyByBv.get(bvId);
        if (!info) continue;
        const o = (bl as any).orders;
        const rawQty = Number((bl as any).quantity || 0);
        const compUnits = rawQty * info.compQty;
        const perUnitCost = info.varCost > 0 ? info.varCost : productCostFallback;
        const lineCost = perUnitCost * compUnits;

        bundleUnits += compUnits;
        bundleCost += lineCost;
        orderIds.add(o.id);

        const vKey = info.varId || "default";
        if (!byVariation[vKey]) byVariation[vKey] = { name: `${info.varName} (במארז)`, quantity: 0, revenue: 0, cost: 0 };
        else byVariation[vKey].name = `${info.varName} (כולל מארזים)`;
        byVariation[vKey].quantity += compUnits;
        byVariation[vKey].cost += lineCost;

        const d = new Date(o.created_at);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[mKey]) byMonth[mKey] = { month: mKey, quantity: 0, revenue: 0, profit: 0 };
        byMonth[mKey].quantity += compUnits;
        byMonth[mKey].profit -= lineCost;
      }
      quantity += bundleUnits;
      cost += bundleCost;

      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        quantity,
        bundleUnits,
        revenueGross,
        revenueNet,
        cost,
        profit: revenueNet - cost,
        margin: revenueNet > 0 ? ((revenueNet - cost) / revenueNet) * 100 : 0,
        orderCount: orderIds.size,
        byVariation: Object.values(byVariation).sort((a, b) => b.revenue - a.revenue),
        byMonth: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
        orders,
      };
    },
  });

  const exportCsv = () => {
    if (!perf) return;
    const headers = ["מס׳ הזמנה", "תאריך", "לקוח", "כמות", "סכום"];
    const rows = perf.orders.map((o) => [
      o.order_number, new Date(o.created_at).toLocaleDateString("he-IL"),
      o.customer_name || "", o.quantity, o.revenue.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-${product?.product_number || id}-performance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayName = product?.name_ar || product?.name || "מוצר";
  const catName = (product as any)?.categories?.name_he || (product as any)?.categories?.name;

  const cards = perf ? [
    { label: "כמות שנמכרה", value: `${perf.quantity}${perf.bundleUnits ? ` (כולל ${perf.bundleUnits} במארזים)` : ""}` },
    { label: "הזמנות", value: perf.orderCount.toString() },
    { label: "הכנסות ברוטו", value: `₪${perf.revenueGross.toFixed(0)}` },
    { label: "הכנסות נטו", value: `₪${perf.revenueNet.toFixed(0)}` },
    { label: "עלות סחורה", value: `₪${perf.cost.toFixed(0)}` },
    { label: "רווח גולמי", value: `₪${perf.profit.toFixed(0)}` },
    { label: "% רווחיות", value: `${perf.margin.toFixed(1)}%` },
  ] : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {product?.image_url && (
            <img src={product.image_url} alt={displayName} className="h-14 w-14 object-cover rounded-md border" />
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" /> {displayName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {product?.product_number && <span>#{product.product_number}</span>}
              {product?.sku && <Badge variant="outline">SKU: {product.sku}</Badge>}
              {catName && <Badge variant="secondary">{catName}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/crm/inventory/products/${id}`}><ArrowRight className="ml-1 h-4 w-4" /> חזרה למוצר</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!perf}>
            <Download className="ml-1 h-4 w-4" /> ייצוא CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)} variant="outline" className="gap-1" dir="rtl">
            <ToggleGroupItem value="today" className="rounded-full px-3 h-8 text-xs">היום</ToggleGroupItem>
            <ToggleGroupItem value="week" className="rounded-full px-3 h-8 text-xs">השבוע</ToggleGroupItem>
            <ToggleGroupItem value="month" className="rounded-full px-3 h-8 text-xs">החודש</ToggleGroupItem>
            <ToggleGroupItem value="30" className="rounded-full px-3 h-8 text-xs">30 יום</ToggleGroupItem>
            <ToggleGroupItem value="90" className="rounded-full px-3 h-8 text-xs">90 יום</ToggleGroupItem>
            <ToggleGroupItem value="365" className="rounded-full px-3 h-8 text-xs">שנה</ToggleGroupItem>
            <ToggleGroupItem value="all" className="rounded-full px-3 h-8 text-xs">הכל</ToggleGroupItem>
            <ToggleGroupItem value="custom" className="rounded-full px-3 h-8 text-xs">טווח מותאם</ToggleGroupItem>
          </ToggleGroup>
          {period === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "מתאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "עד תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}
        </CardContent>
      </Card>

      {!perf ? (
        <p className="text-center py-12 text-muted-foreground">טוען נתונים...</p>
      ) : perf.orderCount === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">לא נמצאו מכירות בתקופה הנבחרת</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>הכנסות ורווח לפי חודש</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={perf.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis orientation="right" />
                    <Tooltip formatter={(v: number) => `₪${v.toFixed(0)}`} />
                    <Bar dataKey="revenue" name="הכנסות" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="profit" name="רווח" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>כמות שנמכרה לפי חודש</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={perf.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis orientation="right" />
                    <Tooltip />
                    <Line type="monotone" dataKey="quantity" name="כמות" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {perf.byVariation.length > 1 && (
            <Card>
              <CardHeader><CardTitle>פירוט לפי וריאציה</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">וריאציה</TableHead>
                      <TableHead className="text-right">כמות</TableHead>
                      <TableHead className="text-right">הכנסות (נטו)</TableHead>
                      <TableHead className="text-right">עלות</TableHead>
                      <TableHead className="text-right">רווח</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perf.byVariation.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell>{v.quantity}</TableCell>
                        <TableCell>₪{v.revenue.toFixed(0)}</TableCell>
                        <TableCell>₪{v.cost.toFixed(0)}</TableCell>
                        <TableCell className={v.revenue - v.cost >= 0 ? "text-green-600" : "text-red-500"}>
                          ₪{(v.revenue - v.cost).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>הזמנות שכוללות מוצר זה ({perf.orders.length})</CardTitle></CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">מס׳</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">לקוח</TableHead>
                    <TableHead className="text-right">כמות</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perf.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link to={`/crm/orders/${o.id}`} className="text-primary hover:underline flex items-center gap-1">
                          #{o.order_number} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("he-IL")}</TableCell>
                      <TableCell>{o.customer_name || "—"}</TableCell>
                      <TableCell>{o.quantity}</TableCell>
                      <TableCell className="font-medium">₪{o.revenue.toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProductPerformancePage;
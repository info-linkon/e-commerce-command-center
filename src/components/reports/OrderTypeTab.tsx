import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { orderInvoiceKind } from "@/hooks/useOrders";
import { ExternalLink } from "lucide-react";

interface Props {
  startDate: string;
  endDate?: string;
}

const paymentLabels: Record<string, string> = {
  cash: "מזומן",
  credit: "אשראי",
  bit: "Bit",
};

export default function OrderTypeTab({ startDate, endDate }: Props) {
  const [tab, setTab] = useState<"with" | "without">("with");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["report-order-type", startDate, endDate],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, order_number, customer_name, total, payment_method, status, created_at, invoice_url, invoice_issued_manually, documents(id, status)")
        .neq("status", "cancelled")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      if (endDate) q = q.lte("created_at", endDate);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { withInvoice, withoutInvoice } = useMemo(() => {
    const w: any[] = [];
    const wo: any[] = [];
    (orders || []).forEach((o) => {
      const kind = orderInvoiceKind(o);
      if (kind === "none") wo.push(o);
      else w.push({ ...o, _invoiceKind: kind });
    });
    return { withInvoice: w, withoutInvoice: wo };
  }, [orders]);

  const sumWith = withInvoice.reduce((s, o) => s + Number(o.total || 0), 0);
  const sumWithout = withoutInvoice.reduce((s, o) => s + Number(o.total || 0), 0);

  const baseColumns: ColumnDef<any>[] = [
    { label: "מס׳", render: (o) => <span className="font-medium">#{o.order_number}</span> },
    { label: "לקוח", render: (o) => o.customer_name || "—" },
    { label: "סה״כ", render: (o) => `₪${Number(o.total).toFixed(2)}` },
    {
      label: "אמצעי תשלום",
      render: (o) => o.payment_method
        ? <Badge variant="secondary" className="text-xs">{paymentLabels[o.payment_method] || o.payment_method}</Badge>
        : <span className="text-muted-foreground text-xs">—</span>,
      hideOnMobile: true,
    },
    { label: "תאריך", render: (o) => new Date(o.created_at).toLocaleDateString("he-IL"), hideOnMobile: true },
  ];

  const columnsWith: ColumnDef<any>[] = [
    ...baseColumns,
    {
      label: "סוג חשבונית",
      render: (o) => o._invoiceKind === "auto"
        ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">אוטומטית</Badge>
        : <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">ידנית</Badge>,
    },
    {
      label: "",
      render: (o) => (
        <Link to={`/crm/orders/${o.id}`} className="text-primary inline-flex items-center gap-1 text-xs">
          פתח <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  const columnsWithout: ColumnDef<any>[] = [
    ...baseColumns,
    {
      label: "",
      render: (o) => (
        <Link to={`/crm/orders/${o.id}`} className="text-primary inline-flex items-center gap-1 text-xs">
          פתח <ExternalLink className="h-3 w-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">עם חשבונית</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withInvoice.length} <span className="text-sm text-muted-foreground font-normal">הזמנות</span></div>
            <div className="text-sm text-muted-foreground mt-1">סה״כ ₪{sumWith.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">בלי חשבונית</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withoutInvoice.length} <span className="text-sm text-muted-foreground font-normal">הזמנות</span></div>
            <div className="text-sm text-muted-foreground mt-1">סה״כ ₪{sumWithout.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "with" | "without")}>
        <TabsList dir="rtl">
          <TabsTrigger value="with">עם חשבונית ({withInvoice.length})</TabsTrigger>
          <TabsTrigger value="without">בלי חשבונית ({withoutInvoice.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="with">
          <Card>
            <CardContent className="pt-6" dir="rtl">
              <MobileCardList
                data={withInvoice}
                columns={columnsWith}
                keyExtractor={(o) => o.id}
                isLoading={isLoading}
                emptyMessage="אין הזמנות עם חשבונית בטווח שנבחר"
                mobileCard={(o) => (
                  <Link to={`/crm/orders/${o.id}`} className="block">
                    <div className="flex justify-between items-start">
                      {o._invoiceKind === "auto"
                        ? <Badge className="bg-green-100 text-green-800 border-0 text-xs">אוטומטית</Badge>
                        : <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">ידנית</Badge>}
                      <span className="font-bold">#{o.order_number}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("he-IL")}</span>
                      <span>{o.customer_name || "—"}</span>
                    </div>
                    <div className="flex justify-end mt-1"><span className="font-bold">₪{Number(o.total).toFixed(2)}</span></div>
                  </Link>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="without">
          <Card>
            <CardContent className="pt-6" dir="rtl">
              <MobileCardList
                data={withoutInvoice}
                columns={columnsWithout}
                keyExtractor={(o) => o.id}
                isLoading={isLoading}
                emptyMessage="אין הזמנות בלי חשבונית בטווח שנבחר"
                mobileCard={(o) => (
                  <Link to={`/crm/orders/${o.id}`} className="block">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-xs">ללא חשבונית</Badge>
                      <span className="font-bold">#{o.order_number}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("he-IL")}</span>
                      <span>{o.customer_name || "—"}</span>
                    </div>
                    <div className="flex justify-end mt-1"><span className="font-bold">₪{Number(o.total).toFixed(2)}</span></div>
                  </Link>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
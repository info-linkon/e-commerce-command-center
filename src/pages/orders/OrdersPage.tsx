import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useOrders, useDeleteOrder, useUpdateOrderStatus, orderInvoiceKind, type OrderStatus } from "@/hooks/useOrders";
import { useCashRegisters } from "@/hooks/useCashRegisters";

const statusLabels: Record<string, string> = {
  pending: "ממתינה",
  pending_payment: "ממתינה לתשלום",
  processing: "בטיפול",
  picking: "בליקוט",
  shipping: "במשלוח",
  completed: "הושלמה",
  cancelled: "בוטלה",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  pending_payment: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  picking: "bg-purple-100 text-purple-800",
  shipping: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const sourceLabels: Record<string, string> = {
  manual: "ידני",
  pos: "POS",
  website: "אתר",
};

const paymentLabels: Record<string, string> = {
  cash: "מזומן",
  credit: "אשראי",
  bit: "Bit",
};

const OrdersPage = ({ defaultStatus }: { defaultStatus?: string }) => {
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus || "all");
  const [search, setSearch] = useState("");
  const [registerFilter, setRegisterFilter] = useState<string>("all");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
  const { data: orders, isLoading } = useOrders(statusFilter === "all" ? undefined : statusFilter as OrderStatus);
  const { data: registers } = useCashRegisters();
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();

  const filtered = orders?.filter((o) => {
    if (registerFilter !== "all") {
      const orderRegister = o.cash_register_id;
      const paymentRegisters = (o.payments || []).map((p: any) => p.cash_register_id).filter(Boolean);
      const matches = orderRegister === registerFilter || paymentRegisters.includes(registerFilter);
      if (!matches) return false;
    }
    if (invoiceFilter !== "all") {
      const kind = orderInvoiceKind(o);
      if (invoiceFilter === "with" && kind === "none") return false;
      if (invoiceFilter === "without" && kind !== "none") return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(s) ||
      o.customer_phone?.includes(s) ||
      String(o.order_number).includes(s)
    );
  }) || [];

  const columns: ColumnDef<any>[] = [
    { label: "מס׳", render: (o) => <span className="font-medium">#{o.order_number}</span> },
    { label: "לקוח", render: (o) => o.customer_name || "—" },
    { label: "טלפון", render: (o) => <span dir="ltr" className="text-right">{o.customer_phone || "—"}</span>, hideOnMobile: true },
    { label: "סה״כ", render: (o) => `₪${Number(o.total).toFixed(2)}` },
    { label: "מקור", render: (o) => <Badge variant="outline" className="text-xs">{sourceLabels[o.source] || o.source}</Badge>, hideOnMobile: true },
    { label: "אמצעי תשלום", render: (o) => o.payment_method ? <Badge variant="secondary" className="text-xs">{paymentLabels[o.payment_method] || o.payment_method}</Badge> : <span className="text-muted-foreground text-xs">—</span>, hideOnMobile: true },
    {
      label: "חשבונית",
      render: (o) => {
        const kind = orderInvoiceKind(o);
        if (kind === "auto") return <Badge className="bg-green-100 text-green-800 border-0 text-xs">אוטומטית</Badge>;
        if (kind === "manual") return <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">ידנית</Badge>;
        return <span className="text-muted-foreground text-xs">—</span>;
      },
      hideOnMobile: true,
    },
    {
      label: "סטטוס",
      render: (o) => {
        const status = o.status as OrderStatus;
        return (
          <Select value={status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v as OrderStatus })}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <Badge className={`${statusColors[status]} border-0`}>{statusLabels[status]}</Badge>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    { label: "תאריך", render: (o) => new Date(o.created_at).toLocaleDateString("he-IL"), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <Button asChild>
          <Link to="/crm/orders/new"><Plus className="ml-2 h-4 w-4" />הזמנה חדשה</Link>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם, טלפון או מספר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue placeholder="כל הסטטוסים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">ממתינה</SelectItem>
            <SelectItem value="processing">בטיפול</SelectItem>
            <SelectItem value="picking">בליקוט</SelectItem>
            <SelectItem value="shipping">במשלוח</SelectItem>
            <SelectItem value="completed">הושלמה</SelectItem>
            <SelectItem value="cancelled">בוטלה</SelectItem>
          </SelectContent>
        </Select>
        <Select value={registerFilter} onValueChange={setRegisterFilter}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue placeholder="כל הקופות" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקופות</SelectItem>
            {registers?.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue placeholder="חשבונית" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל ההזמנות</SelectItem>
            <SelectItem value="with">עם חשבונית</SelectItem>
            <SelectItem value="without">בלי חשבונית</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MobileCardList
        data={filtered}
        columns={columns}
        keyExtractor={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="אין הזמנות"
        mobileCard={(order) => {
          const status = order.status as OrderStatus;
          return (
            <Link to={`/crm/orders/${order.id}`} className="block">
              <div className="flex justify-between items-start">
                <Badge className={`${statusColors[status]} border-0 text-xs`}>{statusLabels[status]}</Badge>
                <span className="font-bold">#{order.order_number}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString("he-IL")}</span>
                <span>{order.customer_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link to={`/crm/orders/${order.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>מחיקת הזמנה</AlertDialogTitle>
                        <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את הזמנה #{order.order_number}?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteOrder.mutate(order.id)}>מחק</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <span className="font-bold">₪{Number(order.total).toFixed(2)}</span>
              </div>
            </Link>
          );
        }}
        actions={(order) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/crm/orders/${order.id}`}><Eye className="h-4 w-4" /></Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>מחיקת הזמנה</AlertDialogTitle>
                  <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את הזמנה #{order.order_number}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteOrder.mutate(order.id)}>מחק</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      />
    </div>
  );
};

export default OrdersPage;

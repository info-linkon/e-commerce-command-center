import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useOrders, useDeleteOrder, useUpdateOrderStatus, type OrderStatus } from "@/hooks/useOrders";

const statusLabels: Record<OrderStatus, string> = {
  pending: "ממתינה",
  processing: "בטיפול",
  completed: "הושלמה",
  cancelled: "בוטלה",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const OrdersPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data: orders, isLoading } = useOrders(statusFilter === "all" ? undefined : statusFilter as OrderStatus);
  const deleteOrder = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();

  const filtered = orders?.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.customer_name?.toLowerCase().includes(s) ||
      o.customer_phone?.includes(s) ||
      String(o.order_number).includes(s)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <Button asChild>
          <Link to="/orders/new"><Plus className="ml-2 h-4 w-4" />הזמנה חדשה</Link>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש לפי שם, טלפון או מספר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="כל הסטטוסים" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">ממתינה</SelectItem>
            <SelectItem value="processing">בטיפול</SelectItem>
            <SelectItem value="completed">הושלמה</SelectItem>
            <SelectItem value="cancelled">בוטלה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מס׳</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">טלפון</TableHead>
              <TableHead className="text-right">סה״כ</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right w-28">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">אין הזמנות</TableCell></TableRow>
            ) : (
              filtered.map((order) => {
                const status = order.status as OrderStatus;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.order_number}</TableCell>
                    <TableCell>{order.customer_name || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-right">{order.customer_phone || "—"}</TableCell>
                    <TableCell>₪{Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}>
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <Badge className={`${statusColors[status]} border-0`}>{statusLabels[status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/orders/${order.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersPage;

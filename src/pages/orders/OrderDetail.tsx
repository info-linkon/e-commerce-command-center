import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrder, useUpdateOrderStatus, type OrderStatus } from "@/hooks/useOrders";

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

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">טוען...</div>;
  if (!order) return <div className="py-12 text-center text-muted-foreground">הזמנה לא נמצאה</div>;

  const status = order.status as OrderStatus;
  const items = (order.order_items as any[]) || [];

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הזמנה #{order.order_number}</h1>
        <Select value={status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}>
          <SelectTrigger className="w-32">
            <Badge className={`${statusColors[status]} border-0`}>{statusLabels[status]}</Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי לקוח</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">שם:</span> {order.customer_name || "—"}</div>
            <div><span className="text-muted-foreground">טלפון:</span> {order.customer_phone || "—"}</div>
            <div><span className="text-muted-foreground">אימייל:</span> {order.customer_email || "—"}</div>
            {order.notes && <div><span className="text-muted-foreground">הערות:</span> {order.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>סיכום</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">₪{Number(order.total).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{items.length} פריטים</div>
            <div className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString("he-IL")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>פריטים</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מוצר</TableHead>
                <TableHead className="text-right">וריאציה</TableHead>
                <TableHead className="text-right">כמות</TableHead>
                <TableHead className="text-right">מחיר יחידה</TableHead>
                <TableHead className="text-right">סה״כ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_variations?.products?.name || "—"}</TableCell>
                  <TableCell>{item.product_variations?.name || "—"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>₪{Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">₪{Number(item.total_price).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetail;

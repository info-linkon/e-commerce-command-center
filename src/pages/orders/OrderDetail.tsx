import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Warehouse, XCircle, AlertTriangle } from "lucide-react";
import DeliveryAssignment from "@/components/orders/DeliveryAssignment";
import PaymentSection from "@/components/orders/PaymentSection";
import { useOrderDelivery } from "@/hooks/useDeliveries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useOrder, useUpdateOrderStatus, useAssignWarehouse, useCancelOrder, type OrderStatus } from "@/hooks/useOrders";
import { useWarehouses } from "@/hooks/useWarehouses";
import PickingChecklist from "@/components/orders/PickingChecklist";

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

const pickingLabels: Record<string, string> = {
  not_started: "טרם החל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrder(id);
  const { data: warehouses } = useWarehouses();
  const { data: delivery } = useOrderDelivery(id);
  const updateStatus = useUpdateOrderStatus();
  const assignWarehouse = useAssignWarehouse();
  const cancelOrder = useCancelOrder();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">טוען...</div>;
  if (!order) return <div className="py-12 text-center text-muted-foreground">הזמנה לא נמצאה</div>;

  const status = order.status as OrderStatus;
  const items = (order.order_items as any[]) || [];
  const isAssigned = !!order.assigned_warehouse_id;
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const warehouseName = (order as any).warehouses?.name;

  const handleAssign = () => {
    if (!selectedWarehouse) return;
    assignWarehouse.mutate({ orderId: order.id, warehouseId: selectedWarehouse });
  };

  const handleCancel = () => {
    cancelOrder.mutate(order.id);
  };

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הזמנה #{order.order_number}</h1>
        <Badge className={`${statusColors[status]} border-0`}>{statusLabels[status]}</Badge>
        {order.picking_status && isAssigned && !isCancelled && (
          <Badge variant="outline">{pickingLabels[order.picking_status] || order.picking_status}</Badge>
        )}
      </div>

      {/* Warehouse Assignment Card */}
      {!isCancelled && !isCompleted && (
        <Card className={isAssigned ? "border-primary/30 bg-primary/5" : "border-dashed border-2 border-muted-foreground/30"}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Warehouse className="h-5 w-5" />
              שיוך למחסן
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isAssigned ? (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {warehouseName || "מחסן משויך"}
                </Badge>
                <span className="text-sm text-muted-foreground">המלאי הורד אוטומטית מהמחסן</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="בחר מחסן..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter(w => w.is_active).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedWarehouse || assignWarehouse.isPending}
                >
                  {assignWarehouse.isPending ? "משייך..." : "שייך והורד מלאי"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customer + Summary */}
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
            <div className="text-sm text-muted-foreground">
              מקור: {order.source === "pos" ? "POS" : order.source === "website" ? "אתר" : "ידני"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Picking Checklist */}
      {isAssigned && !isCancelled && (
        <PickingChecklist orderId={order.id} pickingStatus={order.picking_status} />
      )}

      {/* Delivery Assignment */}
      {isAssigned && !isCancelled && (
        <DeliveryAssignment orderId={order.id} pickingCompleted={order.picking_status === "completed"} />
      )}

      {/* Payment Section */}
      {isAssigned && (
        <PaymentSection
          orderId={order.id}
          orderTotal={Number(order.total)}
          isDelivered={delivery?.status === "delivered"}
          isCancelled={isCancelled}
          isCompleted={isCompleted}
        />
      )

      {/* Items Table */}
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

      {/* Actions */}
      {!isCancelled && !isCompleted && (
        <div className="flex gap-3">
          {!isAssigned && (
            <Select value={status} onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="שנה סטטוס" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).filter(([k]) => k !== "cancelled").map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" />
                ביטול הזמנה
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  ביטול הזמנה #{order.order_number}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isAssigned
                    ? "ההזמנה שויכה למחסן — הביטול יחזיר את המלאי שהורד. פעולה זו אינה ניתנת לביטול."
                    : "האם אתה בטוח שברצונך לבטל את ההזמנה? פעולה זו אינה ניתנת לביטול."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>חזור</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {cancelOrder.isPending ? "מבטל..." : "בטל הזמנה"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;

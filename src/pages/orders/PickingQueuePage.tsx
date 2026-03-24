import { Link } from "react-router-dom";
import { ClipboardList, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrders } from "@/hooks/useOrders";

const pickingLabels: Record<string, string> = {
  not_started: "טרם החל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

const pickingColors: Record<string, string> = {
  not_started: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const PickingQueuePage = () => {
  const { data: orders, isLoading } = useOrders("processing");

  const pickingOrders = orders?.filter(
    (o) => o.assigned_warehouse_id && o.picking_status !== "completed"
  ) || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">תור ליקוט</h1>
        <Badge variant="secondary">{pickingOrders.length} הזמנות</Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מס׳</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">מחסן</TableHead>
              <TableHead className="text-right">סטטוס ליקוט</TableHead>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : pickingOrders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">אין הזמנות ממתינות לליקוט</TableCell></TableRow>
            ) : (
              pickingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.order_number}</TableCell>
                  <TableCell>{order.customer_name || "—"}</TableCell>
                  <TableCell>{(order as any).warehouses?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${pickingColors[order.picking_status || "not_started"]} border-0`}>
                      {pickingLabels[order.picking_status || "not_started"]}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/orders/${order.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PickingQueuePage;

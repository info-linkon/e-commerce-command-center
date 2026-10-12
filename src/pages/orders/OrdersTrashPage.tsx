import { Link } from "react-router-dom";
import { Trash2, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useDeletedOrders, useRestoreOrder, usePurgeOrder } from "@/hooks/useOrders";
import { useUserNames } from "@/hooks/useUserNames";

const OrdersTrashPage = () => {
  const { data: orders, isLoading } = useDeletedOrders();
  const restore = useRestoreOrder();
  const purge = usePurgeOrder();
  const { nameOf } = useUserNames();

  const columns: ColumnDef<any>[] = [
    { label: "מס׳", render: (o) => <span className="font-medium">#{o.order_number}</span> },
    { label: "לקוח", render: (o) => o.customer_name || "—" },
    { label: "סה״כ", render: (o) => `₪${Number(o.total).toFixed(2)}` },
    { label: "נמחקה", render: (o) => new Date(o.deleted_at).toLocaleString("he-IL") },
    { label: "ע״י", render: (o) => (o.deleted_by ? nameOf(o.deleted_by) : "—"), hideOnMobile: true },
  ];

  const actions = (o: any) => (
    <div className="flex gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" asChild><Link to={`/crm/orders/${o.id}`}><Eye className="h-4 w-4" /></Link></Button>
      <Button variant="outline" size="sm" onClick={() => restore.mutate(o.id)}><RotateCcw className="ml-1 h-4 w-4" />שחזר</Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="ml-1 h-4 w-4" />מחק לצמיתות</Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקה לצמיתות</AlertDialogTitle>
            <AlertDialogDescription>הזמנה #{o.order_number} תימחק סופית ולא ניתן יהיה לשחזר אותה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={() => purge.mutate(o.id)}>מחק לצמיתות</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Trash2 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">פח הזמנות</h1>
        <Badge variant="secondary">{orders?.length ?? 0}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">הזמנות שנמחקו נשמרות כאן. שחזור מחזיר את ההזמנה לרשימה בסטטוס "בוטלה".</p>
      <MobileCardList
        data={orders || []}
        columns={columns}
        keyExtractor={(o) => o.id}
        isLoading={isLoading}
        emptyMessage="הפח ריק"
        mobileCard={(o) => (
          <div className="space-y-2">
            <div className="flex justify-between"><span className="font-bold">#{o.order_number}</span><span>₪{Number(o.total).toFixed(2)}</span></div>
            <div className="text-sm text-muted-foreground">{o.customer_name || "—"} · {new Date(o.deleted_at).toLocaleDateString("he-IL")}</div>
            {actions(o)}
          </div>
        )}
        actions={actions}
      />
    </div>
  );
};

export default OrdersTrashPage;

import { useState } from "react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Warehouse, XCircle, AlertTriangle, RefreshCw, CheckCircle2, Loader2, AlertCircle, FileText, ExternalLink, ShieldCheck, ShieldAlert, Plus, Minus, Trash2, Edit3, User } from "lucide-react";
import { useOrderPayments } from "@/hooks/usePayments";
import DeliveryAssignment from "@/components/orders/DeliveryAssignment";
import PaymentSection from "@/components/orders/PaymentSection";
import { useOrderDelivery } from "@/hooks/useDeliveries";
import { useUserNames } from "@/hooks/useUserNames";
import { useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWarehouses } from "@/hooks/useWarehouses";
import PickingChecklist from "@/components/orders/PickingChecklist";
import AddOrderItemDialog from "@/components/orders/AddOrderItemDialog";
import CompleteOrderDialog from "@/components/orders/CompleteOrderDialog";

const statusLabels: Record<string, string> = {
  pending: "ממתינה",
  pending_payment: "ממתינה לתשלום",
  processing: "בטיפול",
  picking: "בליקוט",
  shipping: "במשלוח",
  delivered: "נמסרה",
  completed: "הושלמה",
  cancelled: "בוטלה",
  unfulfilled: "לא מומשה",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  pending_payment: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  picking: "bg-purple-100 text-purple-800",
  shipping: "bg-orange-100 text-orange-800",
  delivered: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  unfulfilled: "bg-gray-200 text-gray-800",
};

const pickingLabels: Record<string, string> = {
  not_started: "טרם החל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

const sourceLabels: Record<string, string> = {
  manual: "ידני",
  pos: "POS",
  website: "אתר",
};

const WooSyncBadge = ({ syncStatus, syncError, orderId }: { syncStatus: string | null; syncError: string | null; orderId: string }) => {
  const [retrying, setRetrying] = useState(false);
  const qc = useQueryClient();

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await supabase.from("orders").update({ woo_sync_status: "syncing", woo_sync_error: null }).eq("id", orderId);
      const { error } = await supabase.functions.invoke("woo-sync", {
        body: { action: "update_order_status", order_id: orderId },
      });
      if (error) throw error;
      await supabase.from("orders").update({ woo_sync_status: "synced", woo_sync_error: null }).eq("id", orderId);
    } catch (err: any) {
      await supabase.from("orders").update({ woo_sync_status: "failed", woo_sync_error: err?.message || "שגיאה" }).eq("id", orderId);
    } finally {
      setRetrying(false);
      qc.invalidateQueries({ queryKey: ["orders", orderId] });
    }
  };

  if (!syncStatus) return null;

  if (syncStatus === "syncing" || retrying) {
    return <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50"><Loader2 className="h-3 w-3 animate-spin" />מסנכרן...</Badge>;
  }

  if (syncStatus === "synced") {
    return <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="h-3 w-3" />WooCommerce מסונכרן</Badge>;
  }

  if (syncStatus === "failed") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-destructive border-destructive/30 bg-destructive/10 cursor-pointer" onClick={handleRetry}>
              <AlertCircle className="h-3 w-3" />
              סנכרון נכשל
              <RefreshCw className="h-3 w-3 mr-1" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>{syncError || "שגיאה בסנכרון"} — לחץ לניסיון חוזר</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
};

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: order, isLoading } = useOrder(id);
  const { data: warehouses } = useWarehouses();
  const { data: delivery } = useOrderDelivery(id);
  const { data: payments } = useOrderPayments(id);
  const updateStatus = useUpdateOrderStatus();
  const assignWarehouse = useAssignWarehouse();
  const cancelOrder = useCancelOrder();
  const { nameOf } = useUserNames();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [editingItems, setEditingItems] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">טוען...</div>;
  if (!order) return <div className="py-12 text-center text-muted-foreground">הזמנה לא נמצאה</div>;

  const status = order.status as OrderStatus;
  const items = (order.order_items as any[]) || [];
  const isAssigned = !!order.assigned_warehouse_id;
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const warehouseName = (order as any).warehouses?.name;

  const totalPaid = (payments || []).reduce((sum, p: any) => {
    const isPlannedSplitCredit =
      (order as any).payment_method === "split" && p.payment_method === "credit" && !p.reference;
    const isDeferredCash =
      p.payment_method === "cash" && p.cash_registers?.requires_completed_order;
    return isPlannedSplitCredit || (!isCompleted && isDeferredCash) ? sum : sum + Number(p.amount);
  }, 0);
  const plannedDigitalPayment = Number((order as any).digital_payment_amount || 0) ||
    (payments || []).reduce((sum, p: any) => (
      (order as any).payment_method === "split" && p.payment_method === "credit" && !p.reference
        ? sum + Number(p.amount)
        : sum
    ), 0);
  const isPaid = totalPaid >= order.total && totalPaid > 0;
  const isPartiallyPaid = totalPaid > 0 && totalPaid < order.total;

  // Self-pickup detection: web checkout marks shipping_city / notes; treat
  // any order with no shipping address and no shipping cost as pickup too.
  const shippingAddrAny = (order as any).shipping_address as string | null | undefined;
  const shippingCityAny = (order as any).shipping_city as string | null | undefined;
  const isPickup =
    shippingCityAny === "איסוף עצמי" ||
    (order.notes || "").startsWith("🏪 איסוף עצמי") ||
    (Number((order as any).shipping_cost || 0) === 0 && !shippingAddrAny && !shippingCityAny);

  const handleAssign = () => {
    if (!selectedWarehouse) return;
    assignWarehouse.mutate({ orderId: order.id, warehouseId: selectedWarehouse });
  };

  const handleCancel = () => {
    cancelOrder.mutate(order.id);
  };

  const recalcOrderTotal = async () => {
    const { data: allItems } = await supabase.from("order_items").select("total_price").eq("order_id", order.id);
    const itemsSum = (allItems || []).reduce((s: number, i: any) => s + Number(i.total_price), 0);
    const shipping = Number((order as any).shipping_cost) || 0;
    const discount = Number((order as any).discount_amount) || 0;
    const newTotal = Math.max(0, itemsSum + shipping - discount);
    await supabase.from("orders").update({ total: newTotal }).eq("id", order.id);
  };

  const adjustInventoryForItem = async (item: any, qtyDelta: number, reason: string) => {
    if (!isAssigned || !order.assigned_warehouse_id || !item.variation_id) return;
    const warehouseId = order.assigned_warehouse_id;

    const { data: bundle } = await supabase
      .from("bundles")
      .select("id, bundle_type")
      .eq("product_id", item.product_variations?.product_id)
      .maybeSingle();

    let components: Array<{ variation_id: string; quantity: number }> = [];
    if (bundle?.id) {
      if (bundle.bundle_type === "variable_bundle" && item.bundle_variation_id) {
        const { data: bvItems } = await supabase
          .from("bundle_variation_items")
          .select("variation_id, quantity")
          .eq("bundle_variation_id", item.bundle_variation_id);
        components = (bvItems || []).map((b) => ({ variation_id: b.variation_id, quantity: b.quantity * Math.abs(qtyDelta) }));
      } else {
        const { data: biItems } = await supabase
          .from("bundle_items")
          .select("variation_id, quantity")
          .eq("bundle_id", bundle.id);
        components = (biItems || []).map((b) => ({ variation_id: b.variation_id, quantity: b.quantity * Math.abs(qtyDelta) }));
      }
    } else {
      components = [{ variation_id: item.variation_id, quantity: Math.abs(qtyDelta) }];
    }

    const sign = qtyDelta > 0 ? -1 : 1;
    const { logInventoryChange } = await import("@/hooks/useInventoryLog");
    const { syncMultipleStockToWoo } = await import("@/lib/wooStockSync");
    for (const c of components) {
      const { data: inv } = await supabase
        .from("inventory")
        .select("*")
        .eq("variation_id", c.variation_id)
        .eq("warehouse_id", warehouseId)
        .maybeSingle();
      const currentQty = inv?.quantity || 0;
      const newQty = currentQty + sign * c.quantity;
      if (inv) {
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
      } else {
        await supabase.from("inventory").insert({
          variation_id: c.variation_id,
          warehouse_id: warehouseId,
          quantity: newQty,
        });
      }
      await logInventoryChange({
        variation_id: c.variation_id,
        warehouse_id: warehouseId,
        quantity_change: sign * c.quantity,
        quantity_after: newQty,
        action_type: sign < 0 ? "sale" : "adjustment",
        reference_id: order.id,
        notes: reason,
      });
    }
    syncMultipleStockToWoo(components.map((c) => c.variation_id));
  };

  const handleUpdateItemQty = async (itemId: string, newQty: number, unitPrice: number) => {
    if (newQty < 1) return;
    const item = items.find((i: any) => i.id === itemId);
    if (!item) return;
    const oldQty = item.quantity;
    const delta = newQty - oldQty;
    if (delta === 0) return;

    const newTotal = unitPrice * newQty;
    await supabase.from("order_items").update({ quantity: newQty, total_price: newTotal }).eq("id", itemId);

    if (isAssigned && delta !== 0) {
      await adjustInventoryForItem(item, delta, `עדכון כמות בהזמנה #${order.order_number}`);
      const { data: pi } = await supabase
        .from("order_picking_items")
        .select("id, quantity")
        .eq("order_item_id", itemId);
      for (const p of pi || []) {
        const perUnit = p.quantity / oldQty;
        const newPickQty = Math.max(1, Math.round(perUnit * newQty));
        await supabase.from("order_picking_items").update({ quantity: newPickQty }).eq("id", p.id);
      }
    }

    await recalcOrderTotal();
    qc.invalidateQueries({ queryKey: ["orders", id] });
    qc.invalidateQueries({ queryKey: ["picking_items", order.id] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    toast.success("הכמות עודכנה");
  };

  const handleDeleteItem = async (itemId: string, _itemTotal: number) => {
    if (items.length <= 1) { toast.error("לא ניתן למחוק את הפריט האחרון"); return; }
    const item = items.find((i: any) => i.id === itemId);
    if (!item) return;

    if (isAssigned) {
      await adjustInventoryForItem(item, -item.quantity, `הסרת פריט מהזמנה #${order.order_number}`);
      await supabase.from("order_picking_items").delete().eq("order_item_id", itemId);
    }

    await supabase.from("order_items").delete().eq("id", itemId);
    await recalcOrderTotal();
    qc.invalidateQueries({ queryKey: ["orders", id] });
    qc.invalidateQueries({ queryKey: ["picking_items", order.id] });
    qc.invalidateQueries({ queryKey: ["inventory"] });
    toast.success("הפריט הוסר");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Payment Status Banner */}
      {!isCancelled && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isPaid 
            ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300" 
            : isPartiallyPaid
            ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
            : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
        }`}>
          {isPaid ? (
            <ShieldCheck className="h-6 w-6 shrink-0" />
          ) : (
            <ShieldAlert className="h-6 w-6 shrink-0" />
          )}
          <div className="flex-1">
            <span className="font-bold text-base">
              {isPaid ? "שולם במלואו ✓" : isPartiallyPaid ? "שולם חלקית" : "לא שולם"}
            </span>
            {(isPartiallyPaid || (!isPaid && totalPaid === 0)) && (
              <span className="text-sm mr-2 opacity-80">
                — {isPaid ? "" : isPartiallyPaid 
                  ? `שולם ₪${totalPaid.toFixed(2)} מתוך ₪${Number(order.total).toFixed(2)}`
                  : plannedDigitalPayment > 0
                  ? `לתשלום דיגיטלי: ₪${plannedDigitalPayment.toFixed(2)} | לגבייה במסירה: ₪${Math.max(0, Number(order.total) - plannedDigitalPayment).toFixed(2)}`
                  : `סה״כ לתשלום: ₪${Number(order.total).toFixed(2)}`}
              </span>
            )}
            {isPaid && (
              <span className="text-sm mr-2 opacity-80">
                — ₪{totalPaid.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/orders")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הזמנה #{order.order_number}</h1>
        <Badge className={`${statusColors[status]} border-0`}>{statusLabels[status]}</Badge>
        {isPickup && (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            🏪 איסוף עצמי
          </Badge>
        )}
        {order.picking_status && isAssigned && !isCancelled && (
          <Badge variant="outline">{pickingLabels[order.picking_status] || order.picking_status}</Badge>
        )}
        {order.source === "website" && (
          <WooSyncBadge 
            syncStatus={(order as any).woo_sync_status} 
            syncError={(order as any).woo_sync_error}
            orderId={order.id}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          className="mr-auto"
          onClick={() => {
            const token = (order as any).access_token;
            const tokenQs = token ? `?t=${token}` : "";
            window.open(`/order/${order.order_number}${tokenQs}`, "_blank");
          }}
        >
          <ExternalLink className="h-4 w-4 ml-1" />
          סיכום הזמנה
        </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי לקוח</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">שם:</span> {order.customer_name || "—"}</div>
            <div><span className="text-muted-foreground">טלפון:</span> {order.customer_phone || "—"}</div>
            <div><span className="text-muted-foreground">אימייל:</span> {order.customer_email || "—"}</div>
            {((order as any).shipping_address || (order as any).shipping_city) && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground font-medium">כתובת משלוח:</span>
                <div className="mt-1">
                  {(order as any).shipping_address && <div>{(order as any).shipping_address}</div>}
                  {((order as any).shipping_city || (order as any).shipping_postcode) && (
                    <div>{[(order as any).shipping_city, (order as any).shipping_postcode].filter(Boolean).join(" ")}</div>
                  )}
                  {(order as any).shipping_country && <div>{(order as any).shipping_country}</div>}
                </div>
              </div>
            )}
            {order.notes && <div><span className="text-muted-foreground">הערות:</span> {order.notes}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>סיכום</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const itemsSubtotal = items.reduce((sum: number, i: any) => sum + Number(i.total_price), 0);
              const discountAmt = Number((order as any).discount_amount) || 0;
              const shippingCost = Number((order as any).shipping_cost) || 0;
              return (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">סה״כ פריטים</span>
                    <span>₪{itemsSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">משלוח</span>
                    <span>{shippingCost > 0 ? `₪${shippingCost.toFixed(2)}` : "חינם"}</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>הנחה {(order as any).discount_type === "percent" ? `(${(order as any).discount_value}%)` : ""}</span>
                      <span>-₪{discountAmt.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                    <span className="font-bold">סה״כ</span>
                    <span className="text-2xl font-bold">₪{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
            <div className="text-sm text-muted-foreground">{items.length} פריטים</div>
            <div className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleString("he-IL")}
            </div>
            <div className="flex gap-2 items-center text-sm text-muted-foreground">
              <span>מקור:</span>
              <Badge variant="outline" className="text-xs">{sourceLabels[order.source] || order.source}</Badge>
            </div>
            {(order as any).created_by && (
              <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>נוצרה ע״י:</span>
                <span className="font-medium text-foreground">{nameOf((order as any).created_by)}</span>
              </div>
            )}
            {isCompleted && (order as any).completed_by && (
              <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span>נסגרה ע״י:</span>
                <span className="font-medium text-foreground">{nameOf((order as any).completed_by)}</span>
              </div>
            )}
            {isCancelled && (order as any).cancelled_by && (
              <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-600" />
                <span>בוטלה ע״י:</span>
                <span className="font-medium text-foreground">{nameOf((order as any).cancelled_by)}</span>
              </div>
            )}
            {(order as any).payment_method && (
              <div className="flex gap-2 items-center text-sm">
                <span className="text-muted-foreground">תשלום:</span>
                <Badge variant="outline" className="text-xs">
                  {{ cash: "מזומן", credit: "תשלום דיגיטלי", bit: "ביט" }[(order as any).payment_method] || (order as any).payment_method}
                </Badge>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {(order as any).includes_vat === false ? "ללא מע״מ" : "כולל מע״מ"}
            </div>
            {(order as any).invoice_url && (
              <a href={(order as any).invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex">
                <Badge className="bg-blue-100 text-blue-800 border-0 gap-1 cursor-pointer hover:bg-blue-200 mt-1">
                  <FileText className="h-3 w-3" />
                  חשבונית מס קבלה
                  <ExternalLink className="h-3 w-3" />
                </Badge>
              </a>
            )}
            {/* סימון ידני של חשבונית — מוצג רק כשאין חשבונית אוטומטית */}
            {!(order as any).invoice_url && (
              <div className="flex items-center gap-2 mt-1 pt-2 border-t">
                {(order as any).invoice_issued_manually ? (
                  <>
                    <Badge className="bg-blue-100 text-blue-800 border-0 gap-1">
                      <FileText className="h-3 w-3" />
                      חשבונית הופקה ידנית
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("orders")
                          .update({ invoice_issued_manually: false } as any)
                          .eq("id", order.id);
                        if (error) toast.error("שגיאה בעדכון");
                        else {
                          toast.success("הסימון בוטל");
                          qc.invalidateQueries({ queryKey: ["orders"] });
                        }
                      }}
                    >
                      בטל סימון
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("orders")
                        .update({ invoice_issued_manually: true } as any)
                        .eq("id", order.id);
                      if (error) toast.error("שגיאה בעדכון");
                      else {
                        toast.success("ההזמנה סומנה כהונפקה לה חשבונית");
                        qc.invalidateQueries({ queryKey: ["orders"] });
                      }
                    }}
                  >
                    <FileText className="h-3 w-3 ml-1" />
                    סמן כחשבונית הופקה ידנית
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Picking Checklist */}
      {isAssigned && !isCancelled && (
        <PickingChecklist orderId={order.id} pickingStatus={order.picking_status} />
      )}

      {/* Delivery Assignment */}
      {isAssigned && !isCancelled && !isPickup && (
        <DeliveryAssignment orderId={order.id} pickingCompleted={order.picking_status === "completed"} />
      )}

      {/* Self-pickup notice (replaces delivery assignment) */}
      {isAssigned && !isCancelled && isPickup && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
          <span className="text-2xl">🏪</span>
          <div className="flex-1">
            <div className="font-semibold">איסוף עצמי</div>
            <div className="text-sm text-muted-foreground">
              ההזמנה תיאסף ע״י הלקוח בחנות — אין צורך בשיוך משלוח. ניתן לרשום תשלום ולסגור את ההזמנה ישירות.
            </div>
          </div>
        </div>
      )}

      {/* Payment Section — show always except cancelled */}
      {!isCancelled && (
        <PaymentSection
          orderId={order.id}
          orderTotal={Number(order.total)}
          orderNumber={order.order_number}
          isDelivered={delivery?.status === "delivered"}
          isCancelled={isCancelled}
          isCompleted={isCompleted}
          isPickup={isPickup}
          customerName={order.customer_name || undefined}
          customerEmail={order.customer_email || undefined}
          customerPhone={order.customer_phone || undefined}
          invoiceUrl={(order as any).invoice_url || null}
          paymentMethod={(order as any).payment_method}
          paymentLinkUrl={(order as any).payment_link_url || null}
          hypTransactionId={(order as any).hyp_transaction_id || null}
          digitalPaymentAmount={Number((order as any).digital_payment_amount || 0)}
          shippingCost={Number((order as any).shipping_cost) || 0}
          discountAmount={Number((order as any).discount_amount) || 0}
          orderItems={items.map((item: any) => {
            const varName = item.bundle_variations?.name || item.product_variations?.name || "";
            // Prefer the parent product SKU (e.g. bundle SKU like BKG-3CH) so picking
            // and invoices reference the catalog item the customer actually bought,
            // not the internal "ברירת מחדל" variation which has no SKU.
            const varSku =
              item.bundle_variations?.sku ||
              item.product_variations?.products?.sku ||
              item.product_variations?.sku ||
              undefined;
            return {
              details: `${item.product_variations?.products?.name_ar || item.product_variations?.products?.name || ""}${varName && !["ברירת מחדל", "default"].includes(varName.toLowerCase()) ? ` - ${varName}` : ""}`.trim(),
              amount: item.quantity,
              price: Number(item.unit_price),
              catalog_number: varSku,
            };
          })}
        />
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>פריטים</CardTitle>
          {!isCancelled && !isCompleted && (
            <div className="flex gap-2 flex-wrap">
              <AddOrderItemDialog orderId={order.id} assignedWarehouseId={order.assigned_warehouse_id} />
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditingItems(!editingItems)}>
                <Edit3 className="h-3.5 w-3.5" />
                {editingItems ? "סיום עריכה" : "ערוך פריטים"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מוצר</TableHead>
                <TableHead className="text-right">וריאציה</TableHead>
                <TableHead className="text-right">מק״ט</TableHead>
                <TableHead className="text-right">כמות</TableHead>
                <TableHead className="text-right">מחיר יחידה</TableHead>
                <TableHead className="text-right">סה״כ</TableHead>
                {editingItems && <TableHead className="text-right w-20">פעולות</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>{item.product_variations?.products?.name_ar || item.product_variations?.products?.name || "—"}</div>
                    {item.product_variations?.products?.name_ar && item.product_variations?.products?.name && (
                      <div className="text-xs text-muted-foreground">{item.product_variations?.products?.name}</div>
                    )}
                  </TableCell>
                  <TableCell>{item.bundle_variations?.name || (item.product_variations?.name && !["ברירת מחדל", "default"].includes(item.product_variations.name.toLowerCase()) ? item.product_variations.name : "—")}</TableCell>
                  <TableCell>{item.bundle_variations?.sku || item.product_variations?.products?.sku || item.product_variations?.sku || "—"}</TableCell>
                  <TableCell>
                    {editingItems ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleUpdateItemQty(item.id, item.quantity - 1, item.unit_price)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleUpdateItemQty(item.id, item.quantity + 1, item.unit_price)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      item.quantity
                    )}
                  </TableCell>
                  <TableCell>₪{Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">₪{(editingItems ? Number(item.unit_price) * item.quantity : Number(item.total_price)).toFixed(2)}</TableCell>
                  {editingItems && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteItem(item.id, item.unit_price * item.quantity)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isCancelled && !isCompleted && (
        <div className="flex gap-3 flex-wrap">
          {/* Status flow buttons for assigned orders */}
          {isAssigned && status === "processing" && (
            <Button
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                updateStatus.mutate({ id: order.id, status: "picking" as OrderStatus });
                supabase.functions.invoke("order-sms-trigger", {
                  body: { order_id: order.id, trigger_type: "order_picking" },
                }).catch(console.error);
              }}
            >
              העבר לליקוט
            </Button>
          )}
          {isAssigned && status === "picking" && (
            <Button
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => {
                updateStatus.mutate({ id: order.id, status: "shipping" as OrderStatus });
                supabase.functions.invoke("order-sms-trigger", {
                  body: { order_id: order.id, trigger_type: "order_shipping" },
                }).catch(console.error);
              }}
            >
              העבר למשלוח
            </Button>
          )}
          {status === "shipping" && (
            <Button
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setCompleteDialogOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              סמן כנמסרה
            </Button>
          )}
          {status === "delivered" && (
            <Button
              variant="outline"
              className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
              onClick={() => {
                updateStatus.mutate({ id: order.id, status: "completed" as OrderStatus });
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              סגור הזמנה
            </Button>
          )}

          {/* Status selector for non-assigned orders or general override */}
          <Select value={status} onValueChange={(v) => {
            if (v === "delivered") {
              setCompleteDialogOpen(true);
              return;
            }
            updateStatus.mutate({ id: order.id, status: v as OrderStatus });
            const triggerMap: Record<string, string> = {
              processing: "order_created",
              picking: "order_picking",
              shipping: "order_shipping",
              delivered: "order_delivered",
              completed: "order_completed",
            };
            const smsTrigger = triggerMap[v];
            if (smsTrigger) {
              supabase.functions.invoke("order-sms-trigger", {
                body: { order_id: order.id, trigger_type: smsTrigger },
              }).catch(console.error);
            }
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="שנה סטטוס" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).filter(([k]) => k !== "cancelled").map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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

      <CompleteOrderDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        orderId={order.id}
        orderNumber={order.order_number}
        customerName={order.customer_name || undefined}
        customerEmail={order.customer_email || undefined}
        customerPhone={order.customer_phone || undefined}
        shippingCost={Number((order as any).shipping_cost) || 0}
        discountAmount={Number((order as any).discount_amount) || 0}
        hasInvoice={!!(order as any).invoice_url}
        orderItems={items.map((item: any) => {
          const varName = item.bundle_variations?.name || item.product_variations?.name || "";
          const varSku =
            item.bundle_variations?.sku ||
            item.product_variations?.products?.sku ||
            item.product_variations?.sku ||
            undefined;
          return {
            details: `${item.product_variations?.products?.name_ar || item.product_variations?.products?.name || ""}${varName && !["ברירת מחדל", "default"].includes(varName.toLowerCase()) ? ` - ${varName}` : ""}`.trim(),
            amount: item.quantity,
            price: Number(item.unit_price),
            catalog_number: varSku,
          };
        })}
      />
    </div>
  );
};

export default OrderDetail;

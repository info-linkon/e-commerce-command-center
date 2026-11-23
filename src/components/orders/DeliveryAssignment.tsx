import { useEffect, useMemo, useState } from "react";
import { Truck, CheckCircle2, RefreshCw, AlertTriangle } from "lucide-react";
import PrintLabelButton from "@/components/orders/PrintLabelButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeAmountDue } from "@/lib/order-payments";
import {
  useOrderDelivery,
  useCreateDelivery,
  useUpdateDeliveryStatus,
  useOliveryAreas,
  useOliverySubAreas,
  useCreateOliveryDelivery,
  useSendDeliveryToOlivery,
  useSyncOliveryDelivery,
  oliveryStatusLabels,
  printLabelsForDeliveries,
} from "@/hooks/useDeliveries";
import { useDeliveryCompanies } from "@/hooks/useDeliveryCompanies";

const statusLabels: Record<string, string> = {
  pending: "ממתין לאיסוף",
  in_transit: "בדרך",
  delivered: "נמסר",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};

interface DeliveryAssignmentProps {
  orderId: string;
  pickingCompleted: boolean;
  /** Amount already paid (same calculation as the order page badge). */
  amountPaid?: number;
  order?: {
    total?: number | null;
    digital_payment_amount?: number | null;
    shipping_address?: string | null;
    shipping_city?: string | null;
  };
}

const norm = (s?: string | null) => (s || "").replace(/[\s\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").toLowerCase();

/** Area + sub-area + COD fields for Olivery shipments. */
const OliveryFields = ({
  area, setArea, subArea, setSubArea, cod, setCod, address, setAddress, city, paid = 0, total = 0,
}: {
  area: string; setArea: (v: string) => void;
  subArea: string; setSubArea: (v: string) => void;
  cod: string; setCod: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  city?: string | null;
  paid?: number; total?: number;
}) => {
  const { data: areas, isLoading: areasLoading, error: areasError } = useOliveryAreas();
  const { data: subAreas } = useOliverySubAreas();

  const selectedArea = areas?.find((a) => a.name === area);
  const areaSubs = useMemo(
    () => (subAreas || []).filter((s) => selectedArea && s.area_id === selectedArea.id),
    [subAreas, selectedArea],
  );

  // Try to pre-select area / sub-area from the order's city
  useEffect(() => {
    if (area || !city || !areas?.length) return;
    const c = norm(city);
    const sub = subAreas?.find((s) => norm(s.name) === c);
    if (sub) {
      setArea(sub.area_name);
      setSubArea(sub.name);
      return;
    }
    const a = areas.find((x) => norm(x.name) === c);
    if (a) setArea(a.name);
  }, [city, areas, subAreas, area, setArea, setSubArea]);

  if (areasError) {
    return (
      <div className="text-sm text-destructive flex items-center gap-1">
        <AlertTriangle className="h-4 w-4" /> שגיאה בטעינת אזורי Olivery: {(areasError as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3 bg-muted/30">
      <div className="space-y-1">
        <Label className="text-xs">אזור (Olivery) *</Label>
        <Select value={area} onValueChange={(v) => { setArea(v); setSubArea(""); }}>
          <SelectTrigger><SelectValue placeholder={areasLoading ? "טוען אזורים..." : "בחר אזור..."} /></SelectTrigger>
          <SelectContent>
            {areas?.map((a) => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {areaSubs.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">תת-אזור</Label>
          <Select value={subArea} onValueChange={setSubArea}>
            <SelectTrigger><SelectValue placeholder="בחר תת-אזור..." /></SelectTrigger>
            <SelectContent>
              {areaSubs.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">כתובת למשלוח</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">סכום לגבייה מהלקוח (₪)</Label>
        <Input type="number" min={0} step="0.01" value={cod} onChange={(e) => setCod(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          סה״כ ₪{total.toFixed(2)} · שולם ₪{paid.toFixed(2)}
          {paid >= total && total > 0 && " · ההזמנה שולמה במלואה – אין לגבות מהלקוח"}
        </p>
        {Number(cod) > 0 && paid >= total && total > 0 && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> ההזמנה כבר שולמה – השליח יגבה ₪{Number(cod).toFixed(2)} מהלקוח
          </p>
        )}
      </div>
    </div>
  );
};

const DeliveryAssignment = ({ orderId, pickingCompleted, order, amountPaid = 0 }: DeliveryAssignmentProps) => {
  const { data: delivery, isLoading } = useOrderDelivery(orderId);
  const { data: companies } = useDeliveryCompanies(true);
  const createDelivery = useCreateDelivery();
  const updateStatus = useUpdateDeliveryStatus();
  const createOlivery = useCreateOliveryDelivery();
  const sendToOlivery = useSendDeliveryToOlivery();
  const syncOlivery = useSyncOliveryDelivery();

  const defaultCod = computeAmountDue(order?.total, amountPaid);
  const defaultAddress = [order?.shipping_address, order?.shipping_city].filter(Boolean).join(", ");

  const [companyId, setCompanyId] = useState("");
  const [notes, setNotes] = useState("");
  const [area, setArea] = useState("");
  const [subArea, setSubArea] = useState("");
  const [cod, setCod] = useState(String(defaultCod));
  const [address, setAddress] = useState(defaultAddress);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => { setCod(String(defaultCod)); }, [defaultCod]);
  useEffect(() => { setAddress(defaultAddress); }, [defaultAddress]);

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const isOliveryCompany = selectedCompany?.provider === "olivery";

  if (isLoading) return null;

  const handleCreate = () => {
    if (!companyId) return;
    if (isOliveryCompany) {
      if (!area) return;
      createOlivery.mutate({
        order_id: orderId,
        delivery_company_id: companyId,
        notes: notes || undefined,
        area,
        sub_area: subArea || undefined,
        cod_amount: Number(cod) || 0,
        address: address || undefined,
      });
      return;
    }
    createDelivery.mutate({ order_id: orderId, delivery_company_id: companyId, notes: notes || undefined });
  };
  const creating = createDelivery.isPending || createOlivery.isPending;

  // Delivery already exists
  if (delivery) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              משלוח
            </div>
            <Badge className={`${statusColors[delivery.status]} border-0`}>
              {statusLabels[delivery.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PrintLabelButton className="w-full" onPrint={(n) => printLabelsForDeliveries([delivery.id], n)} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">חברה:</span>
            <span className="font-medium">{(delivery as any).delivery_companies?.name}</span>
            {(delivery as any).delivery_companies?.is_internal && (
              <Badge variant="outline" className="text-xs">פנימי</Badge>
            )}
          </div>
          {(delivery as any).delivery_companies?.provider === "olivery" && (
            <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
              {delivery.external_id ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-muted-foreground">מס׳ משלוח Olivery:</span>{" "}
                      <span className="font-mono font-medium">{delivery.external_sequence || delivery.external_id}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => syncOlivery.mutate(delivery.id)}
                      disabled={syncOlivery.isPending}
                      title="רענן סטטוס מ-Olivery"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncOlivery.isPending ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  {delivery.external_status && (
                    <div>
                      <span className="text-muted-foreground">סטטוס Olivery:</span>{" "}
                      <Badge variant="outline">{oliveryStatusLabels[delivery.external_status] || delivery.external_status}</Badge>
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    {[delivery.external_area, delivery.external_sub_area].filter(Boolean).join(" / ")}
                    {delivery.cod_amount != null && <> · גבייה: ₪{Number(delivery.cod_amount).toFixed(2)}</>}
                  </div>
                  {delivery.external_synced_at && (
                    <div className="text-xs text-muted-foreground">
                      עודכן: {new Date(delivery.external_synced_at).toLocaleString("he-IL")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> המשלוח לא נשלח ל-Olivery
                  </div>
                  {showRetry ? (
                    <>
                      <OliveryFields
                        area={area} setArea={setArea} subArea={subArea} setSubArea={setSubArea}
                        cod={cod} setCod={setCod} address={address} setAddress={setAddress} city={order?.shipping_city}
            paid={amountPaid} total={Number(order?.total || 0)}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!area || sendToOlivery.isPending}
                        onClick={() => sendToOlivery.mutate({
                          delivery_id: delivery.id, area, sub_area: subArea || undefined,
                          cod_amount: Number(cod) || 0, address: address || undefined,
                        })}
                      >
                        {sendToOlivery.isPending ? "שולח..." : "שלח ל-Olivery"}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setShowRetry(true)}>שלח ל-Olivery</Button>
                  )}
                </>
              )}
              {delivery.external_error && (
                <div className="text-xs text-destructive break-words">{delivery.external_error}</div>
              )}
            </div>
          )}
          {delivery.notes && (
            <div className="text-sm"><span className="text-muted-foreground">הערות:</span> {delivery.notes}</div>
          )}
          {delivery.delivered_at && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              נמסר ב-{new Date(delivery.delivered_at).toLocaleString("he-IL")}
            </div>
          )}
          {delivery.status !== "delivered" && !delivery.external_id && (
            <div className="flex gap-2 pt-1">
              {delivery.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: delivery.id, status: "in_transit" })}
                  disabled={updateStatus.isPending}
                >
                  סמן בדרך
                </Button>
              )}
              {(delivery.status === "pending" || delivery.status === "in_transit") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: delivery.id, status: "delivered" })}
                  disabled={updateStatus.isPending}
                >
                  סמן נמסר
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // No delivery yet — show assignment form only if picking completed
  if (!pickingCompleted) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <Truck className="h-5 w-5 mx-auto mb-2 opacity-50" />
          שיוך משלוח יהיה זמין לאחר השלמת הליקוט
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="h-5 w-5" />
          שיוך משלוח
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder="בחר חברת משלוח..." />
          </SelectTrigger>
          <SelectContent>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.is_internal ? "(פנימי)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOliveryCompany && (
          <OliveryFields
            area={area} setArea={setArea} subArea={subArea} setSubArea={setSubArea}
            cod={cod} setCod={setCod} address={address} setAddress={setAddress} city={order?.shipping_city}
            paid={amountPaid} total={Number(order?.total || 0)}
          />
        )}
        <Input
          placeholder="הערות (אופציונלי)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          onClick={handleCreate}
          disabled={!companyId || creating || (isOliveryCompany && !area)}
          className="w-full"
        >
          {creating ? "יוצר..." : isOliveryCompany ? "צור משלוח ב-Olivery" : "צור משלוח"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DeliveryAssignment;

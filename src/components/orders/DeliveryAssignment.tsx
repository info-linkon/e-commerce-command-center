import { useState } from "react";
import { Truck, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useOrderDelivery, useCreateDelivery, useUpdateDeliveryStatus } from "@/hooks/useDeliveries";
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
}

const DeliveryAssignment = ({ orderId, pickingCompleted }: DeliveryAssignmentProps) => {
  const { data: delivery, isLoading } = useOrderDelivery(orderId);
  const { data: companies } = useDeliveryCompanies(true);
  const createDelivery = useCreateDelivery();
  const updateStatus = useUpdateDeliveryStatus();

  const [companyId, setCompanyId] = useState("");
  const [notes, setNotes] = useState("");

  if (isLoading) return null;

  const handleCreate = () => {
    if (!companyId) return;
    createDelivery.mutate({ order_id: orderId, delivery_company_id: companyId, notes: notes || undefined });
  };

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
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">חברה:</span>
            <span className="font-medium">{(delivery as any).delivery_companies?.name}</span>
            {(delivery as any).delivery_companies?.is_internal && (
              <Badge variant="outline" className="text-xs">פנימי</Badge>
            )}
          </div>
          {delivery.notes && (
            <div className="text-sm"><span className="text-muted-foreground">הערות:</span> {delivery.notes}</div>
          )}
          {delivery.delivered_at && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              נמסר ב-{new Date(delivery.delivered_at).toLocaleString("he-IL")}
            </div>
          )}
          {delivery.status !== "delivered" && (
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
        <Input
          placeholder="הערות (אופציונלי)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          onClick={handleCreate}
          disabled={!companyId || createDelivery.isPending}
          className="w-full"
        >
          {createDelivery.isPending ? "יוצר..." : "צור משלוח"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DeliveryAssignment;

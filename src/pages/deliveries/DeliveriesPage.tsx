import { useState } from "react";
import { Truck, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileCardList, type ColumnDef } from "@/components/ui/mobile-card-list";
import { useDeliveries, useUpdateDeliveryStatus } from "@/hooks/useDeliveries";
import { useNavigate } from "react-router-dom";

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

const DeliveriesPage = () => {
  const [filter, setFilter] = useState<string>("all");
  const { data: deliveries, isLoading } = useDeliveries(filter === "all" ? undefined : filter as any);
  const updateStatus = useUpdateDeliveryStatus();
  const navigate = useNavigate();

  const data = (deliveries || []) as any[];

  const columns: ColumnDef<any>[] = [
    {
      label: "הזמנה",
      render: (d) => (
        <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/orders/${d.order_id}`)}>
          #{d.orders?.order_number}
        </Button>
      ),
    },
    { label: "לקוח", render: (d) => d.orders?.customer_name || "—" },
    {
      label: "חברת משלוח",
      render: (d) => (
        <div className="flex items-center gap-1">
          {d.delivery_companies?.name}
          {d.delivery_companies?.is_internal && <Badge variant="outline" className="text-xs">פנימי</Badge>}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      label: "סטטוס",
      render: (d) => <Badge className={`${statusColors[d.status]} border-0`}>{statusLabels[d.status]}</Badge>,
    },
    { label: "תאריך", render: (d) => new Date(d.created_at).toLocaleDateString("he-IL"), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          משלוחים
        </h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="in_transit">בדרך</SelectItem>
            <SelectItem value="delivered">נמסר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MobileCardList
        data={data}
        columns={columns}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        emptyMessage="אין משלוחים"
        mobileCard={(d) => (
          <div>
            <div className="flex justify-between items-start">
              <Badge className={`${statusColors[d.status]} border-0 text-xs`}>{statusLabels[d.status]}</Badge>
              <Button variant="link" className="p-0 h-auto font-bold" onClick={() => navigate(`/orders/${d.order_id}`)}>
                #{d.orders?.order_number}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-muted-foreground">{d.delivery_companies?.name}</span>
              <span>{d.orders?.customer_name || "—"}</span>
            </div>
            {d.status !== "delivered" && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <Select value={d.status} onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v as any })}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <ArrowLeftRight className="h-3 w-3 ml-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="in_transit">בדרך</SelectItem>
                    <SelectItem value="delivered">נמסר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        actions={(d) =>
          d.status !== "delivered" ? (
            <Select value={d.status} onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v as any })}>
              <SelectTrigger className="w-32 h-8">
                <ArrowLeftRight className="h-3 w-3 ml-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">ממתין</SelectItem>
                <SelectItem value="in_transit">בדרך</SelectItem>
                <SelectItem value="delivered">נמסר</SelectItem>
              </SelectContent>
            </Select>
          ) : null
        }
      />
    </div>
  );
};

export default DeliveriesPage;

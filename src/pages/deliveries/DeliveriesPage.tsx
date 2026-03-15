import { useState } from "react";
import { Truck, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          משלוחים
        </h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="in_transit">בדרך</SelectItem>
            <SelectItem value="delivered">נמסר</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">טוען...</div>
          ) : !deliveries?.length ? (
            <div className="py-12 text-center text-muted-foreground">אין משלוחים</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">הזמנה</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">חברת משלוח</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate(`/orders/${d.order_id}`)}
                      >
                        #{d.orders?.order_number}
                      </Button>
                    </TableCell>
                    <TableCell>{d.orders?.customer_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {d.delivery_companies?.name}
                        {d.delivery_companies?.is_internal && (
                          <Badge variant="outline" className="text-xs">פנימי</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[d.status]} border-0`}>
                        {statusLabels[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>
                      {d.status !== "delivered" && (
                        <Select
                          value={d.status}
                          onValueChange={(v) => updateStatus.mutate({ id: d.id, status: v as any })}
                        >
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveriesPage;

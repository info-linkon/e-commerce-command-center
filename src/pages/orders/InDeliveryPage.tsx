import { Link } from "react-router-dom";
import { Truck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const deliveryStatusLabels: Record<string, string> = {
  pending: "ממתין",
  in_transit: "בדרך",
  delivered: "נמסר",
};

const deliveryStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
};

const InDeliveryPage = () => {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["in-delivery-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, orders(order_number, customer_name, customer_phone, shipping_address, shipping_city), delivery_companies(name)")
        .in("status", ["pending", "in_transit"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">הזמנות במשלוח</h1>
        <Badge variant="secondary">{deliveries?.length || 0} משלוחים</Badge>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מס׳ הזמנה</TableHead>
              <TableHead className="text-right">לקוח</TableHead>
              <TableHead className="text-right">כתובת</TableHead>
              <TableHead className="text-right">חברת משלוח</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !deliveries?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">אין הזמנות במשלוח</TableCell></TableRow>
            ) : (
              deliveries.map((d) => {
                const order = d.orders as any;
                const company = d.delivery_companies as any;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">#{order?.order_number}</TableCell>
                    <TableCell>{order?.customer_name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {[order?.shipping_address, order?.shipping_city].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>{company?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${deliveryStatusColors[d.status]} border-0`}>
                        {deliveryStatusLabels[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/orders/${d.order_id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
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

export default InDeliveryPage;

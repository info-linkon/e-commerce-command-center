import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  pending: "ממתינה",
  processing: "בטיפול",
  completed: "הושלמה",
  cancelled: "בוטלה",
};

const RecentActivity = () => {
  const { data: orders } = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>הזמנות אחרונות</CardTitle>
      </CardHeader>
      <CardContent>
        {!orders?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">אין הזמנות אחרונות</p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{statusLabels[o.status] || o.status}</Badge>
                  <span className="font-medium">₪{Number(o.total).toFixed(0)}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">#{o.order_number}</span>
                  {o.customer_name && <span className="text-muted-foreground mr-2">{o.customer_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;

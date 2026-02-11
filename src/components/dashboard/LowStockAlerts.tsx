import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const LowStockAlerts = () => {
  const { data: lowItems } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("quantity, product_variations(name, products(name)), warehouses(name)")
        .lte("quantity", 5)
        .order("quantity", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <CardTitle>התראות מלאי נמוך</CardTitle>
      </CardHeader>
      <CardContent>
        {!lowItems?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">אין התראות מלאי נמוך</p>
        ) : (
          <div className="space-y-3">
            {lowItems.map((item, i) => {
              const v = item.product_variations as any;
              const w = item.warehouses as any;
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-bold text-destructive">{item.quantity}</span>
                  <div className="text-right">
                    <span className="font-medium">{v?.products?.name} - {v?.name}</span>
                    <span className="text-muted-foreground mr-2">({w?.name})</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;

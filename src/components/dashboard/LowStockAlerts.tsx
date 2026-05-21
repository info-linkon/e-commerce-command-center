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
        .select("variation_id, quantity, product_variations(name, product_id, products(name, name_ar))");
      if (error) throw error;
      // Aggregate across all warehouses by variation
      const byVar = new Map<string, { qty: number; vName: string; pName: string }>();
      for (const row of data || []) {
        const v: any = row.product_variations;
        if (!v) continue;
        const id = row.variation_id as string;
        const existing = byVar.get(id);
        const qty = (existing?.qty || 0) + (row.quantity || 0);
        byVar.set(id, {
          qty,
          vName: v?.name || "",
          pName: v?.products?.name_ar || v?.products?.name || "—",
        });
      }
      return Array.from(byVar.values())
        .filter((r) => r.qty <= 5)
        .sort((a, b) => a.qty - b.qty)
        .slice(0, 5);
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
            {lowItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-bold text-destructive">{item.qty}</span>
                <div className="text-right">
                  <span className="font-medium">{item.pName} - {item.vName}</span>
                  <span className="text-muted-foreground mr-2">(סה״כ במחסנים)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;

import { Package, CheckCircle2, Circle, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { usePickingItems, useTogglePickedItem } from "@/hooks/usePickingItems";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const pickingLabels: Record<string, string> = {
  not_started: "טרם החל",
  in_progress: "בתהליך",
  completed: "הושלם",
};

const pickingColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
};

interface PickingChecklistProps {
  orderId: string;
  pickingStatus: string | null;
}

const PickingChecklist = ({ orderId, pickingStatus }: PickingChecklistProps) => {
  const { data: items, isLoading } = usePickingItems(orderId);
  const togglePicked = useTogglePickedItem();

  // Get product_ids from picking items to detect bundles
  const productIds = items
    ?.map((i: any) => i.order_items?.product_variations?.product_id)
    .filter(Boolean) as string[] | undefined;

  // Fetch bundles for these product_ids
  const { data: bundlesMap } = useQuery({
    queryKey: ["picking-bundles", productIds],
    enabled: !!productIds && productIds.length > 0,
    queryFn: async () => {
      const uniqueIds = [...new Set(productIds!)];
      const { data: bundles } = await supabase
        .from("bundles")
        .select("id, product_id, bundle_type")
        .in("product_id", uniqueIds);
      if (!bundles || bundles.length === 0) return {};

      const bundleIds = bundles.map(b => b.id);
      const { data: bundleItems } = await supabase
        .from("bundle_items")
        .select("*, product_variations(name, name_ar, products(name, name_ar))")
        .in("bundle_id", bundleIds);

      // Group by product_id
      const map: Record<string, any[]> = {};
      for (const b of bundles) {
        map[b.product_id] = (bundleItems || [])
          .filter((bi: any) => bi.bundle_id === b.id)
          .map((bi: any) => ({
            name: bi.product_variations?.name || "—",
            name_ar: bi.product_variations?.name_ar,
            productName: bi.product_variations?.products?.name || "—",
            productNameAr: bi.product_variations?.products?.name_ar,
            quantity: bi.quantity,
          }));
      }
      return map;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) return null;

  const pickedCount = items.filter((i) => i.picked).length;
  const status = pickingStatus || "not_started";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ליקוט
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              {pickedCount}/{items.length}
            </span>
            <Badge className={`${pickingColors[status]} border-0 text-xs`}>
              {pickingLabels[status] || status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item: any) => {
            const orderItem = item.order_items;
            const variation = orderItem?.product_variations;
            const productName = variation?.products?.name || "—";
            const variationName = variation?.name || "";
            const productId = variation?.product_id;
            const bundleComponents = productId ? bundlesMap?.[productId] : null;
            const orderQty = orderItem?.quantity || 1;

            return (
              <div key={item.id}>
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    item.picked
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : "bg-card border-border hover:bg-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={item.picked}
                    disabled={togglePicked.isPending}
                    onCheckedChange={(checked) =>
                      togglePicked.mutate({
                        pickingItemId: item.id,
                        picked: !!checked,
                        orderId,
                      })
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{productName}</div>
                    {variationName && (
                      <div className="text-xs text-muted-foreground">{variationName}</div>
                    )}
                  </div>
                  <div className="text-sm font-medium">×{orderItem?.quantity || 0}</div>
                  {item.picked ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </label>

                {/* Bundle components breakdown */}
                {bundleComponents && bundleComponents.length > 0 && (
                  <div className="mr-8 mt-1 space-y-1">
                    {bundleComponents.map((comp: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5 border border-dashed"
                      >
                        <span className="font-medium">×{comp.quantity * orderQty}</span>
                        <span>
                          {comp.productNameAr || comp.productName}
                          {comp.name_ar || comp.name ? ` — ${comp.name_ar || comp.name}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PickingChecklist;

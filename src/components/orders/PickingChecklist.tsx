import { CheckCircle2, Circle, Loader2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { usePickingItems, useTogglePickedItem } from "@/hooks/usePickingItems";

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
  const status = pickingStatus || "not_started";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              ליקוט
            </div>
            <Badge className={`${pickingColors[status]} border-0 text-xs`}>
              {pickingLabels[status] || status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            לא נמצאו עדיין שורות ליקוט להזמנה הזו.
          </div>
        </CardContent>
      </Card>
    );
  }

  const pickedCount = items.filter((i) => i.picked).length;

  const groupedByOrderItem = items.reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.order_item_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

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
        <div className="space-y-4">
          {Object.values(groupedByOrderItem).map((group: any[], groupIndex) => {
            const first = group[0];
            const isBundle = group.length > 1;
            const parentProductName = first?.product_variations?.products?.name_ar || first?.product_variations?.products?.name || "—";

            return (
              <div key={`${first.order_item_id}-${groupIndex}`} className="space-y-2">
                {isBundle && (
                  <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium">מארז</span>
                    <span className="text-muted-foreground">{parentProductName}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {group.map((item: any) => {
                    const variation = item.product_variations;
                    const productName = variation?.products?.name_ar || variation?.products?.name || "—";
                    const variationName = variation?.name_ar || variation?.name || "";
                    const imageUrl = variation?.products?.image_url || null;

                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          item.picked
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                            : "bg-card border-border hover:bg-accent/50"
                        } ${isBundle ? "mr-4" : ""}`}
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

                        {imageUrl ? (
                          <img src={imageUrl} alt={productName} className="h-10 w-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{productName}</div>
                          {variationName && (
                            <div className="text-xs text-muted-foreground">{variationName}</div>
                          )}
                        </div>

                        <div className="text-sm font-medium">×{item.quantity || 0}</div>

                        {item.picked ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PickingChecklist;

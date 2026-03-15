import { Package, CheckCircle2, Circle, Loader2 } from "lucide-react";
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

            return (
              <label
                key={item.id}
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
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PickingChecklist;

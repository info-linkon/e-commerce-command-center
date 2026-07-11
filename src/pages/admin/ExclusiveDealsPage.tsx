import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useExclusiveDealsAdmin,
  useAddExclusiveDeal,
  useRemoveExclusiveDeal,
  useToggleExclusiveDeal,
  useReorderExclusiveDeal,
} from "@/hooks/useExclusiveDeals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";

export default function ExclusiveDealsPage() {
  const { data: deals, isLoading } = useExclusiveDealsAdmin();
  const addDeal = useAddExclusiveDeal();
  const removeDeal = useRemoveExclusiveDeal();
  const toggleDeal = useToggleExclusiveDeal();
  const reorder = useReorderExclusiveDeal();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["deals-product-search", search],
    enabled: pickerOpen && search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, name_ar, sale_price, image_url, sku")
        .or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,sku.ilike.%${search}%`)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const existingIds = new Set((deals || []).map((d: any) => d.product_id));

  const move = async (index: number, dir: -1 | 1) => {
    if (!deals) return;
    const j = index + dir;
    if (j < 0 || j >= deals.length) return;
    const a = deals[index] as any;
    const b = deals[j] as any;
    qc.setQueryData(["exclusive-deals-admin"], (old: any[] | undefined) => {
      if (!old) return old;
      const copy = [...old];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
    await reorder.mutateAsync([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ]);
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">מבצעים מיוחדים</h1>
          <p className="text-sm text-muted-foreground mt-1">
            המוצרים שיופיעו בסליידר "صفقات حصرية / מבצעים מיוחדים" בעמוד הבית
          </p>
        </div>
        <Button onClick={() => { setSearch(""); setPickerOpen(true); }}>
          <Plus className="ml-2 h-4 w-4" /> הוסף מוצר
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !deals?.length ? (
        <p className="text-muted-foreground">אין מוצרים במבצעים מיוחדים עדיין</p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal: any, index: number) => {
            const p = deal.products;
            const displayName = p.name_ar || p.name;
            return (
              <div
                key={deal.id}
                className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={index === deals.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-14 h-14 object-cover rounded" />
                ) : (
                  <div className="w-14 h-14 rounded bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-sm text-muted-foreground">₪{Number(p.sale_price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0" style={{ direction: "ltr" }}>
                  <Switch
                    checked={deal.active}
                    onCheckedChange={(checked) => toggleDeal.mutate({ id: deal.id, active: checked })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeal.mutate(deal.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר מוצר</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חפש לפי שם או מק״ט (לפחות 2 תווים)"
                className="pr-9"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {(searchResults || []).map((p: any) => {
                const already = existingIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={already || addDeal.isPending}
                    onClick={async () => {
                      await addDeal.mutateAsync(p.id);
                      setPickerOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent transition-colors text-right disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name_ar || p.name}</p>
                      <p className="text-xs text-muted-foreground">₪{Number(p.sale_price).toFixed(2)}</p>
                    </div>
                    {already && <span className="text-xs text-muted-foreground">כבר קיים</span>}
                  </button>
                );
              })}
              {search.length >= 2 && (searchResults?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">לא נמצאו מוצרים</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
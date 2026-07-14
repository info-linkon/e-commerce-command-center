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
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

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

  const existingKeys = new Set(
    (deals || []).map((d: any) => `${d.product_id}::${d.variation_id ?? ""}`),
  );

  const { data: productVariations } = useQuery({
    queryKey: ["deals-product-variations", selectedProduct?.id],
    enabled: !!selectedProduct?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variations")
        .select("id, name, name_ar, price, image_url")
        .eq("product_id", selectedProduct.id)
        .order("name");
      return (data || []).filter((v: any) => v.name !== "ברירת מחדל");
    },
  });

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground truncate">{displayName}</p>
                    {deal.product_variations && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {deal.product_variations.name_ar || deal.product_variations.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ₪{Number(deal.product_variations?.price ?? p.sale_price).toFixed(2)}
                  </p>
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

      <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) setSelectedProduct(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "בחר וריאציה" : "בחר מוצר"}</DialogTitle>
          </DialogHeader>
          {selectedProduct ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{selectedProduct.name_ar || selectedProduct.name}</p>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                <button
                  disabled={existingKeys.has(`${selectedProduct.id}::`) || addDeal.isPending}
                  onClick={async () => {
                    await addDeal.mutateAsync({ productId: selectedProduct.id, variationId: null });
                    setPickerOpen(false);
                    setSelectedProduct(null);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent text-right disabled:opacity-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">המוצר כולו (בלי וריאציה)</p>
                    <p className="text-xs text-muted-foreground">₪{Number(selectedProduct.sale_price).toFixed(2)}</p>
                  </div>
                  {existingKeys.has(`${selectedProduct.id}::`) && <span className="text-xs text-muted-foreground">כבר קיים</span>}
                </button>
                {(productVariations || []).map((v: any) => {
                  const already = existingKeys.has(`${selectedProduct.id}::${v.id}`);
                  return (
                    <button
                      key={v.id}
                      disabled={already || addDeal.isPending}
                      onClick={async () => {
                        await addDeal.mutateAsync({ productId: selectedProduct.id, variationId: v.id });
                        setPickerOpen(false);
                        setSelectedProduct(null);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent text-right disabled:opacity-50"
                    >
                      {v.image_url ? (
                        <img src={v.image_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.name_ar || v.name}</p>
                        <p className="text-xs text-muted-foreground">₪{Number(v.price).toFixed(2)}</p>
                      </div>
                      {already && <span className="text-xs text-muted-foreground">כבר קיים</span>}
                    </button>
                  );
                })}
                {(productVariations || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">אין וריאציות למוצר זה</p>
                )}
              </div>
              <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="w-full">
                חזרה לחיפוש
              </Button>
            </div>
          ) : (
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
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent transition-colors text-right"
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
                  </button>
                );
              })}
              {search.length >= 2 && (searchResults?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">לא נמצאו מוצרים</p>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
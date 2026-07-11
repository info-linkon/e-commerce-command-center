import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ChevronUp, ChevronDown, Search, Loader2 } from "lucide-react";
import {
  useRelatedProductsAdmin,
  useAddRelatedProduct,
  useRemoveRelatedProduct,
  useReorderRelatedProducts,
} from "@/hooks/useRelatedProducts";

interface Props { productId: string }

export function RelatedProductsManager({ productId }: Props) {
  const { data: related, isLoading } = useRelatedProductsAdmin(productId);
  const addRel = useAddRelatedProduct();
  const removeRel = useRemoveRelatedProduct();
  const reorder = useReorderRelatedProducts();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["related-picker-search", search, productId],
    enabled: pickerOpen && search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, name_ar, sale_price, image_url, sku")
        .or(`name.ilike.%${search}%,name_ar.ilike.%${search}%,sku.ilike.%${search}%`)
        .neq("id", productId)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const existingIds = new Set((related || []).map((r: any) => r.related_product_id));

  const move = async (index: number, dir: -1 | 1) => {
    if (!related) return;
    const j = index + dir;
    if (j < 0 || j >= related.length) return;
    const a = related[index] as any;
    const b = related[j] as any;
    await reorder.mutateAsync({
      productId,
      updates: [
        { id: a.id, sort_order: b.sort_order },
        { id: b.id, sort_order: a.sort_order },
      ],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">מוצרים שיוצגו בסוף עמוד המוצר תחת "מוצרים קשורים"</p>
        <Button size="sm" onClick={() => { setSearch(""); setPickerOpen(true); }}>
          <Plus className="ml-1 h-4 w-4" /> הוסף
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !related?.length ? (
        <p className="text-sm text-muted-foreground text-center py-4">אין מוצרים קשורים עדיין</p>
      ) : (
        <div className="space-y-2">
          {related.map((r: any, index: number) => {
            const p = r.products;
            const displayName = p?.name_ar || p?.name || "—";
            return (
              <div key={r.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-md">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => move(index, -1)}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === related.length - 1} onClick={() => move(index, 1)}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
                {p?.image_url ? (
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">₪{Number(p?.sale_price || 0).toFixed(2)}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRel.mutate({ id: r.id, productId })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>בחר מוצר קשור</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי שם או מק״ט (לפחות 2 תווים)" className="pr-9" />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {(searchResults || []).map((p: any) => {
                const already = existingIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    disabled={already || addRel.isPending}
                    onClick={async () => {
                      await addRel.mutateAsync({ productId, relatedId: p.id });
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
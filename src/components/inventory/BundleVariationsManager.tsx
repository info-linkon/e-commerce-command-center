import { useState } from "react";
import { Plus, Pencil, Trash2, X, Copy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  useBundleVariations,
  useCreateBundleVariation,
  useUpdateBundleVariation,
  useDeleteBundleVariation,
} from "@/hooks/useBundleVariations";
import { useProducts, useProductVariations } from "@/hooks/useProducts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BundleVariationsManagerProps {
  bundleId: string;
}

interface VariationItem {
  variation_id: string;
  quantity: number;
  label: string;
}

export function BundleVariationsManager({ bundleId }: BundleVariationsManagerProps) {
  const { data: bundleVariations, isLoading } = useBundleVariations(bundleId);
  const createVariation = useCreateBundleVariation();
  const updateVariation = useUpdateBundleVariation();
  const deleteVariation = useDeleteBundleVariation();
  const { data: products } = useProducts();

  const openDuplicate = (bv: any) => {
    setEditingId(null);
    setName(bv.name ? `${bv.name} (עותק)` : "");
    setNameHe((bv as any).name_he ? `${(bv as any).name_he} (עותק)` : "");
    setSku("");
    setPrice(Number(bv.price) || 0);
    setImageUrl((bv as any).image_url || null);
    const mappedItems = (bv.bundle_variation_items || []).map((bvi: any) => {
      const pv = bvi.product_variations;
      const productName = (pv?.products as any)?.name || "";
      return {
        variation_id: bvi.variation_id,
        quantity: bvi.quantity,
        label: productName ? `${productName} — ${pv?.name}` : pv?.name || "",
      };
    });
    setItems(mappedItems);
    setSelectedProduct("");
    setDialogOpen(true);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameHe, setNameHe] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<VariationItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const availableProducts = (products || []).filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.name_ar || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
  });
  const { data: productVariations } = useProductVariations(selectedProduct || undefined);

  const { data: allVariations } = useQuery({
    queryKey: ["all-variations-for-bundle-var"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*, products(name, cost_price)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setNameHe("");
    setSku("");
    setPrice(0);
    setImageUrl(null);
    setItems([]);
    setSelectedProduct("");
    setDialogOpen(true);
  };

  const openEdit = (bv: any) => {
    setEditingId(bv.id);
    setName(bv.name);
    setNameHe((bv as any).name_he || "");
    setSku((bv as any).sku || "");
    setPrice(Number(bv.price));
    setImageUrl((bv as any).image_url || null);
    const mappedItems = (bv.bundle_variation_items || []).map((bvi: any) => {
      const pv = bvi.product_variations;
      const productName = (pv?.products as any)?.name || "";
      return {
        variation_id: bvi.variation_id,
        quantity: bvi.quantity,
        label: productName ? `${productName} — ${pv?.name}` : pv?.name || "",
      };
    });
    setItems(mappedItems);
    setSelectedProduct("");
    setDialogOpen(true);
  };

  const addItem = (variationId: string) => {
    if (items.find((i) => i.variation_id === variationId)) return;
    const variation = allVariations?.find((v) => v.id === variationId);
    const productName = (variation?.products as any)?.name || "";
    setItems([
      ...items,
      {
        variation_id: variationId,
        quantity: 1,
        label: productName ? `${productName} — ${variation?.name}` : variation?.name || "",
      },
    ]);
  };

  const removeItem = (variationId: string) => {
    setItems(items.filter((i) => i.variation_id !== variationId));
  };

  const updateQuantity = (variationId: string, qty: number) => {
    setItems(items.map((i) => (i.variation_id === variationId ? { ...i, quantity: qty } : i)));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(publicUrl);
      toast.success("התמונה הועלתה");
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const payload = {
      bundleId,
      name,
      name_he: nameHe,
      sku,
      price,
      image_url: imageUrl,
      items: items.map(({ variation_id, quantity }) => ({ variation_id, quantity })),
    };

    if (editingId) {
      updateVariation.mutate(
        { ...payload, variationId: editingId },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createVariation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const isPending = createVariation.isPending || updateVariation.isPending;

  if (isLoading) return <p className="text-sm text-muted-foreground">טוען...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">כל וריאציה מכילה שילוב פריטים ומחיר משלה</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 ml-1" />
          הוסף וריאציה
        </Button>
      </div>

      {bundleVariations && bundleVariations.length > 0 ? (
        <div className="space-y-2">
          {bundleVariations.map((bv) => (
            <Card key={bv.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(bv as any).image_url ? (
                    <img src={(bv as any).image_url} alt={bv.name} className="w-12 h-12 object-cover rounded border" />
                  ) : (
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                     <span className="font-medium">{(bv as any).name_he || bv.name}</span>
                      <Badge variant="secondary">₪{Number(bv.price).toFixed(2)}</Badge>
                      {(bv as any).sku && <Badge variant="outline">{(bv as any).sku}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(bv as any).bundle_variation_items?.length || 0} פריטים
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(bv)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="שכפל וריאציה" onClick={() => openDuplicate(bv)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteVariation.mutate({ variationId: bv.id, bundleId })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">אין וריאציות עדיין</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת וריאציה" : "וריאציה חדשה"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 min-h-0 overflow-y-auto pe-1">
            <div className="space-y-2">
              <Label>תמונה</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative group">
                    <img src={imageUrl} alt="תמונת וריאציה" className="w-16 h-16 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                <Label htmlFor="bv-img" className="flex items-center gap-1 cursor-pointer text-xs text-primary hover:underline">
                  <Upload className="h-3 w-3" />
                  {uploading ? "מעלה..." : "העלה תמונה"}
                </Label>
                <input id="bv-img" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם הוריאציה (ערבית)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: طقم صغير" dir="rtl" />
              </div>
              <div className="space-y-2">
                <Label>שם הוריאציה (עברית)</Label>
                <Input value={nameHe} onChange={(e) => setNameHe(e.target.value)} placeholder="למשל: מארז קטן" dir="rtl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>מחיר</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            {(() => {
              const computed = items.reduce((sum, it) => {
                const v = allVariations?.find((av: any) => av.id === it.variation_id);
                const vc = Number((v as any)?.cost_price || 0);
                const pc = Number((v as any)?.products?.cost_price || 0);
                const unit = vc > 0 ? vc : pc;
                return sum + unit * Number(it.quantity || 0);
              }, 0);
              return items.length > 0 ? (
                <div className="text-xs text-muted-foreground bg-muted/60 rounded-md p-2">
                  עלות מחושבת מהרכיבים: <span className="font-semibold text-foreground">₪{computed.toFixed(2)}</span>
                </div>
              ) : null;
            })()}
            <div className="space-y-2">
              <Label>מק"ט (SKU)</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="למשל: BV-001" dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>הוסף פריטים</Label>
              <Input
                placeholder="חפש מוצר..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="בחר מוצר" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {productVariations && productVariations.length > 0 && (
                  <Select onValueChange={addItem}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="בחר וריאציה" />
                    </SelectTrigger>
                    <SelectContent>
                      {productVariations.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.variation_id} className="flex items-center gap-2 rounded-lg bg-muted p-2">
                    <span className="flex-1 text-sm">{item.label}</span>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.variation_id, Number(e.target.value))}
                      className="w-16"
                      min={1}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.variation_id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={handleSave} disabled={!name || isPending}>
              {isPending ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

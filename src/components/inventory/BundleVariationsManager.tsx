import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
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
        .select("*, products(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setPrice(0);
    setItems([]);
    setSelectedProduct("");
    setDialogOpen(true);
  };

  const openEdit = (bv: any) => {
    setEditingId(bv.id);
    setName(bv.name);
    setPrice(Number(bv.price));
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

  const handleSave = () => {
    const payload = {
      bundleId,
      name,
      price,
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
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{bv.name}</span>
                    <Badge variant="secondary">₪{Number(bv.price).toFixed(2)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(bv as any).bundle_variation_items?.length || 0} פריטים
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(bv)}>
                    <Pencil className="h-4 w-4" />
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
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת וריאציה" : "וריאציה חדשה"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם הוריאציה</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: מארז קטן" />
              </div>
              <div className="space-y-2">
                <Label>מחיר</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>הוסף פריטים</Label>
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="בחר מוצר" />
                  </SelectTrigger>
                  <SelectContent>
                    {variableProducts.map((p) => (
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
                  <div key={item.variation_id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
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

          <DialogFooter>
            <Button onClick={handleSave} disabled={!name || isPending}>
              {isPending ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

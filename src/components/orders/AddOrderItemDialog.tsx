import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { useBundles } from "@/hooks/useBundles";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";

interface AddOrderItemDialogProps {
  orderId: string;
  assignedWarehouseId: string | null;
  onAdded?: () => void;
}

export default function AddOrderItemDialog({ orderId, assignedWarehouseId, onAdded }: AddOrderItemDialogProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [loadingVars, setLoadingVars] = useState(false);

  const { data: products } = useProducts();
  const { data: bundles } = useBundles();

  const bundleProductIds = useMemo(() => new Set((bundles || []).map((b: any) => b.product_id)), [bundles]);

  const filtered = useMemo(() => {
    const list = (products || []).filter((p: any) => p.is_published !== false);
    const q = search.trim().toLowerCase();
    if (!q) return list.slice(0, 30);
    return list.filter((p: any) =>
      (p.name_ar || "").toLowerCase().includes(q) ||
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, search]);

  const handleSelectProduct = async (productId: string) => {
    setSelectedProductId(productId);
    setSelectedVariationId("");
    setLoadingVars(true);
    const { data } = await supabase
      .from("product_variations")
      .select("id, name, price, sku")
      .eq("product_id", productId)
      .order("name");
    setVariations(data || []);
    // Auto-select if only one variation (default)
    if (data && data.length === 1) {
      setSelectedVariationId(data[0].id);
    }
    setLoadingVars(false);
  };

  const reset = () => {
    setSearch("");
    setSelectedProductId(null);
    setSelectedVariationId("");
    setQuantity(1);
    setVariations([]);
  };

  const handleAdd = async () => {
    if (!selectedVariationId || quantity < 1) {
      toast.error("בחר וריאציה וכמות תקינה");
      return;
    }
    setSubmitting(true);
    try {
      const variation = variations.find((v) => v.id === selectedVariationId);
      const unitPrice = Number(variation?.price || 0);
      const totalPrice = unitPrice * quantity;

      // Check if it's a bundle
      const isBundle = bundleProductIds.has(selectedProductId!);
      let bundleVariationId: string | null = null;
      if (isBundle) {
        const bundle = (bundles || []).find((b: any) => b.product_id === selectedProductId);
        if (bundle) {
          const { data: bvs } = await supabase
            .from("bundle_variations")
            .select("id")
            .eq("bundle_id", bundle.id)
            .limit(1);
          if (bvs && bvs.length > 0) bundleVariationId = bvs[0].id;
        }
      }

      // Insert order item
      const { data: newItem, error: itemErr } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          variation_id: selectedVariationId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          bundle_variation_id: bundleVariationId,
        })
        .select()
        .single();
      if (itemErr) throw itemErr;

      // If warehouse assigned — deduct stock + log + create picking items
      if (assignedWarehouseId) {
        // Determine components to deduct
        let components: Array<{ variation_id: string; quantity: number }> = [];
        if (isBundle) {
          const bundle = (bundles || []).find((b: any) => b.product_id === selectedProductId);
          if (bundle) {
            if (bundle.bundle_type === "variable_bundle" && bundleVariationId) {
              const { data: bvItems } = await supabase
                .from("bundle_variation_items")
                .select("variation_id, quantity")
                .eq("bundle_variation_id", bundleVariationId);
              components = (bvItems || []).map((b) => ({ variation_id: b.variation_id, quantity: b.quantity * quantity }));
            } else {
              const { data: biItems } = await supabase
                .from("bundle_items")
                .select("variation_id, quantity")
                .eq("bundle_id", bundle.id);
              components = (biItems || []).map((b) => ({ variation_id: b.variation_id, quantity: b.quantity * quantity }));
            }
          }
        } else {
          components = [{ variation_id: selectedVariationId, quantity }];
        }

        // Deduct inventory + log
        for (const c of components) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("*")
            .eq("variation_id", c.variation_id)
            .eq("warehouse_id", assignedWarehouseId)
            .maybeSingle();
          const currentQty = inv?.quantity || 0;
          const newQty = currentQty - c.quantity;
          if (inv) {
            await supabase.from("inventory").update({ quantity: newQty }).eq("id", inv.id);
          } else {
            await supabase.from("inventory").insert({
              variation_id: c.variation_id,
              warehouse_id: assignedWarehouseId,
              quantity: newQty,
            });
          }
          await logInventoryChange({
            variation_id: c.variation_id,
            warehouse_id: assignedWarehouseId,
            quantity_change: -c.quantity,
            quantity_after: newQty,
            action_type: "sale",
            reference_id: orderId,
            notes: `הוספת פריט להזמנה`,
          });
        }
        syncMultipleStockToWoo(components.map((c) => c.variation_id));

        // Create picking items — one row per unit
        const pickingRows = components.flatMap((c) =>
          Array.from({ length: c.quantity }, () => ({
            order_id: orderId,
            order_item_id: newItem.id,
            variation_id: c.variation_id,
            quantity: 1,
          }))
        );
        if (pickingRows.length > 0) {
          await supabase.from("order_picking_items").insert(pickingRows as any);
        }
      }

      // Recalculate order total
      const { data: allItems } = await supabase.from("order_items").select("total_price").eq("order_id", orderId);
      const itemsSum = (allItems || []).reduce((s: number, i: any) => s + Number(i.total_price), 0);
      const { data: ord } = await supabase.from("orders").select("shipping_cost, discount_amount").eq("id", orderId).single();
      const shipping = Number((ord as any)?.shipping_cost) || 0;
      const discount = Number((ord as any)?.discount_amount) || 0;
      const newTotal = Math.max(0, itemsSum + shipping - discount);
      await supabase.from("orders").update({ total: newTotal }).eq("id", orderId);

      qc.invalidateQueries({ queryKey: ["orders", orderId] });
      qc.invalidateQueries({ queryKey: ["picking_items", orderId] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("הפריט נוסף להזמנה");
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err: any) {
      console.error("Add order item error:", err);
      toast.error(err?.message || "שגיאה בהוספת פריט");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          הוסף פריט
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>הוסף פריט להזמנה</DialogTitle>
        </DialogHeader>

        {!selectedProductId ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש מוצר לפי שם או מק״ט..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">לא נמצאו מוצרים</div>
              )}
              {filtered.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-accent transition-colors text-right"
                >
                  <div className="w-10 h-10 bg-muted rounded shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p.name_ar || p.name}</div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      {p.sku && <span>מק״ט: {p.sku}</span>}
                      {bundleProductIds.has(p.id) && <span className="text-primary">מארז</span>}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">₪{Number(p.sale_price).toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
              <div className="text-sm font-medium">
                {(products || []).find((p: any) => p.id === selectedProductId)?.name_ar ||
                 (products || []).find((p: any) => p.id === selectedProductId)?.name}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedProductId(null); setVariations([]); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {loadingVars ? (
              <div className="text-center text-sm text-muted-foreground py-4">טוען וריאציות...</div>
            ) : variations.length > 1 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">וריאציה</label>
                <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר וריאציה" />
                  </SelectTrigger>
                  <SelectContent>
                    {variations.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} — ₪{Number(v.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium">כמות</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setSelectedProductId(null); setVariations([]); }}>חזור</Button>
              <Button onClick={handleAdd} disabled={!selectedVariationId || submitting}>
                {submitting ? "מוסיף..." : "הוסף להזמנה"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBundle } from "@/hooks/useBundles";
import { useProducts, useProductVariations } from "@/hooks/useProducts";

const BundleForm = () => {
  const navigate = useNavigate();
  const createBundle = useCreateBundle();
  const { data: products } = useProducts();
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState(0);
  const [items, setItems] = useState<{ variation_id: string; quantity: number; label: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  // Get variable products for picking variations
  const variableProducts = products?.filter((p) => p.product_type === "variable") || [];
  const { data: variations } = useProductVariations(selectedProduct || undefined);

  const addItem = (variationId: string) => {
    if (items.find((i) => i.variation_id === variationId)) return;
    const variation = variations?.find((v) => v.id === variationId);
    setItems([...items, { variation_id: variationId, quantity: 1, label: variation?.name || "" }]);
  };

  const removeItem = (variationId: string) => {
    setItems(items.filter((i) => i.variation_id !== variationId));
  };

  const updateQuantity = (variationId: string, qty: number) => {
    setItems(items.map((i) => (i.variation_id === variationId ? { ...i, quantity: qty } : i)));
  };

  const handleSave = () => {
    createBundle.mutate(
      {
        productData: { name, sale_price: salePrice, product_type: "simple" },
        bundleType: "simple_bundle",
        items: items.map(({ variation_id, quantity }) => ({ variation_id, quantity })),
      },
      { onSuccess: () => navigate("/inventory/bundles") }
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/bundles")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הוספת מארז חדש</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>פרטי המארז</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>שם המארז</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>מחיר מכירה</Label>
                <Input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>פריטים במארז</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="בחר מוצר" /></SelectTrigger>
                  <SelectContent>
                    {variableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {variations && variations.length > 0 && (
                  <Select onValueChange={addItem}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="בחר וריאציה" /></SelectTrigger>
                    <SelectContent>
                      {variations.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.variation_id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <span className="flex-1 font-medium">{item.label}</span>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.variation_id, Number(e.target.value))}
                        className="w-20"
                        min={1}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.variation_id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Button className="w-full" onClick={handleSave} disabled={!name || createBundle.isPending}>
            {createBundle.isPending ? "שומר..." : "שמור מארז"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BundleForm;

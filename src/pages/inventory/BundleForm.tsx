import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBundle, useUpdateBundle, useBundle } from "@/hooks/useBundles";
import { useProducts, useProductVariations } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { VariationsManager } from "@/components/inventory/VariationsManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BundleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const { data: bundle } = useBundle(id);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();

  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    sku: "",
    description: "",
    description_ar: "",
    short_description: "",
    short_description_ar: "",
    sale_price: 0,
    cost_price: 0,
    category_id: "" as string | null,
    is_published: false,
    image_url: "" as string | null,
    bundle_type: "simple_bundle" as "simple_bundle" | "variable_bundle",
  });

  const [items, setItems] = useState<{ variation_id: string; quantity: number; label: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { data: allVariations } = useQuery({
    queryKey: ["all-variations-for-bundle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*, products(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const variableProducts = products?.filter((p) => p.product_type === "variable") || [];
  const { data: variations } = useProductVariations(selectedProduct || undefined);

  // Load existing bundle data
  useEffect(() => {
    if (bundle && isEditing) {
      const product = (bundle as any).products;
      setForm({
        name: product?.name || "",
        name_ar: product?.name_ar || "",
        sku: product?.sku || "",
        description: product?.description || "",
        description_ar: product?.description_ar || "",
        short_description: product?.short_description || "",
        short_description_ar: product?.short_description_ar || "",
        sale_price: Number(product?.sale_price || 0),
        cost_price: Number(product?.cost_price || 0),
        category_id: product?.category_id || null,
        is_published: product?.is_published || false,
        image_url: product?.image_url || null,
        bundle_type: bundle.bundle_type,
      });
      const bundleItems = (bundle as any).bundle_items || [];
      setItems(bundleItems.map((bi: any) => {
        const v = allVariations?.find((av) => av.id === bi.variation_id);
        const productName = (v?.products as any)?.name || "";
        return {
          variation_id: bi.variation_id,
          quantity: bi.quantity,
          label: productName ? `${productName} — ${bi.product_variations?.name || ""}` : bi.product_variations?.name || "",
        };
      }));
    }
  }, [bundle, isEditing, allVariations]);

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
      setForm({ ...form, image_url: publicUrl });
      toast.success("התמונה הועלתה");
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  const addItem = (variationId: string) => {
    if (items.find((i) => i.variation_id === variationId)) return;
    const variation = allVariations?.find((v) => v.id === variationId);
    const productName = (variation?.products as any)?.name || "";
    setItems([...items, {
      variation_id: variationId,
      quantity: 1,
      label: productName ? `${productName} — ${variation?.name}` : variation?.name || "",
    }]);
  };

  const removeItem = (variationId: string) => {
    setItems(items.filter((i) => i.variation_id !== variationId));
  };

  const updateQuantity = (variationId: string, qty: number) => {
    setItems(items.map((i) => (i.variation_id === variationId ? { ...i, quantity: qty } : i)));
  };

  const handleSave = () => {
    const productData = {
      name: form.name,
      name_ar: form.name_ar || null,
      sku: form.sku || null,
      description: form.description || null,
      description_ar: form.description_ar || null,
      short_description: form.short_description || null,
      short_description_ar: form.short_description_ar || null,
      sale_price: form.sale_price,
      cost_price: form.cost_price,
      category_id: form.category_id || null,
      is_published: form.is_published,
      image_url: form.image_url || null,
      product_type: form.bundle_type === "variable_bundle" ? "variable" as const : "simple" as const,
    };

    const bundleItems = items.map(({ variation_id, quantity }) => ({ variation_id, quantity }));

    if (isEditing && bundle) {
      updateBundle.mutate(
        {
          bundleId: bundle.id,
          productId: bundle.product_id,
          productData,
          bundleType: form.bundle_type,
          items: bundleItems,
        },
        { onSuccess: () => navigate("/inventory/bundles") }
      );
    } else {
      createBundle.mutate(
        {
          productData,
          bundleType: form.bundle_type,
          items: bundleItems,
        },
        { onSuccess: () => navigate("/inventory/bundles") }
      );
    }
  };

  const isPending = createBundle.isPending || updateBundle.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/bundles")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditing ? "עריכת מארז" : "הוספת מארז חדש"}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Details */}
          <Card>
            <CardHeader><CardTitle>פרטי המארז</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם המארז (עברית)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>اسم المجموعة (ערבית)</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>מק״ט</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>קטגוריה</Label>
                  <Select value={form.category_id || "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא קטגוריה</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תיאור קצר (עברית)</Label>
                  <Textarea value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>وصف مختصر (ערבית)</Label>
                  <Textarea value={form.short_description_ar} onChange={(e) => setForm({ ...form, short_description_ar: e.target.value })} rows={3} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תיאור מלא (עברית)</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>وصف كامل (ערבית)</Label>
                  <Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} rows={6} dir="rtl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bundle Items */}
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
                      <span className="flex-1 font-medium text-sm">{item.label}</span>
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

          {/* Variations Manager for variable bundles */}
          {isEditing && form.bundle_type === "variable_bundle" && bundle && (
            <Card>
              <CardHeader><CardTitle>וריאציות מארז</CardTitle></CardHeader>
              <CardContent>
                <VariationsManager productId={bundle.product_id} />
              </CardContent>
            </Card>
          )}
          {!isEditing && form.bundle_type === "variable_bundle" && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-4">שמור את המארז תחילה כדי להוסיף וריאציות</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Image */}
          <Card>
            <CardHeader><CardTitle>תמונות</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.image_url && (
                <img src={form.image_url} alt="תמונת מארז" className="w-full h-40 object-cover rounded-lg border" />
              )}
              <Label htmlFor="bundle-image-upload" className="flex items-center gap-2 cursor-pointer justify-center p-3 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "מעלה..." : "העלה תמונה"}
              </Label>
              <input id="bundle-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </CardContent>
          </Card>

          {/* Prices */}
          <Card>
            <CardHeader><CardTitle>מחירים</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>מחיר מכירה</Label>
                <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>מחיר עלות (ללא מע״מ)</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader><CardTitle>הגדרות</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>סוג מארז</Label>
                <Select value={form.bundle_type} onValueChange={(v: "simple_bundle" | "variable_bundle") => setForm({ ...form, bundle_type: v })} disabled={isEditing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple_bundle">פשוט</SelectItem>
                    <SelectItem value="variable_bundle">עם וריאציות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>מפורסם באתר</Label>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={!form.name || isPending}>
            {isPending ? "שומר..." : "שמור מארז"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BundleForm;

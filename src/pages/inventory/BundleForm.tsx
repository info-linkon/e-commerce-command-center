import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBundle, useUpdateBundle, useBundle } from "@/hooks/useBundles";
import { useProducts, useProductVariations } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useProductCategories, useSetProductCategories } from "@/hooks/useProductCategories";
import { BundleVariationsManager } from "@/components/inventory/BundleVariationsManager";
import { RelatedProductsManager } from "@/components/inventory/RelatedProductsManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BundleForm = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromProductId = searchParams.get("fromProduct");
  const navigate = useNavigate();
  const isEditing = !!id;
  const createBundle = useCreateBundle();
  const updateBundle = useUpdateBundle();
  const { data: bundle } = useBundle(id);
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const productIdForCategories = bundle?.product_id || fromProductId || undefined;
  const { data: existingCategoryIds } = useProductCategories(productIdForCategories);
  const setProductCategories = useSetProductCategories();
  // Unified multi-select: holds ALL category IDs (primary = first one)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (existingCategoryIds && existingCategoryIds.length > 0) {
      setSelectedCategoryIds(existingCategoryIds);
    }
  }, [existingCategoryIds]);

  // Load source product when converting from products list
  const { data: sourceProduct } = useQuery({
    queryKey: ["product-for-bundle", fromProductId],
    enabled: !!fromProductId && !isEditing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", fromProductId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

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
    shipping_price: 0,
    category_id: "" as string | null,
    is_published: false,
    image_url: "" as string | null,
    bundle_type: "simple_bundle" as "simple_bundle" | "variable_bundle",
  });

  const [items, setItems] = useState<{ variation_id: string; quantity: number; label: string }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ src: string }[]>([]);

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

  const [productSearch, setProductSearch] = useState("");
  const availableProducts = (products || []).filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.name_ar || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
  });
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
        shipping_price: Number(product?.shipping_price || 0),
        category_id: product?.category_id || null,
        is_published: product?.is_published || false,
        image_url: product?.image_url || null,
        bundle_type: bundle.bundle_type,
      });
      if (product?.gallery_images && Array.isArray(product.gallery_images)) {
        setGalleryImages((product.gallery_images as { src: string }[]).filter((img: any) => img.src));
      }
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

  // Pre-fill form when converting a product to bundle
  useEffect(() => {
    if (sourceProduct && !isEditing) {
      setForm({
        name: sourceProduct.name || "",
        name_ar: sourceProduct.name_ar || "",
        sku: sourceProduct.sku || "",
        description: sourceProduct.description || "",
        description_ar: sourceProduct.description_ar || "",
        short_description: sourceProduct.short_description || "",
        short_description_ar: sourceProduct.short_description_ar || "",
        sale_price: Number(sourceProduct.sale_price || 0),
        cost_price: Number(sourceProduct.cost_price || 0),
        shipping_price: Number(sourceProduct.shipping_price || 0),
        category_id: sourceProduct.category_id || null,
        is_published: sourceProduct.is_published || false,
        image_url: sourceProduct.image_url || null,
        bundle_type: "simple_bundle",
      });
      if (sourceProduct.gallery_images && Array.isArray(sourceProduct.gallery_images)) {
        setGalleryImages((sourceProduct.gallery_images as { src: string }[]).filter((img: any) => img.src));
      }
    }
  }, [sourceProduct, isEditing]);

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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const newImages: { src: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
        newImages.push({ src: publicUrl });
      }
      setGalleryImages(prev => [...prev, ...newImages]);
      toast.success(`${newImages.length} תמונות הועלו`);
    } catch {
      toast.error("שגיאה בהעלאת תמונות");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
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
      shipping_price: form.shipping_price,
      category_id: form.category_id || null,
      is_published: form.is_published,
      image_url: form.image_url || null,
      gallery_images: galleryImages,
      product_type: form.bundle_type === "variable_bundle" ? "variable" as const : "simple" as const,
    };

    const bundleItems = items.map(({ variation_id, quantity }) => ({ variation_id, quantity }));

    // Use unified selection; first selected = primary
    const allCategoryIds = Array.from(new Set(selectedCategoryIds));
    const primaryCategoryId = allCategoryIds[0] || null;
    productData.category_id = primaryCategoryId;

    if (isEditing && bundle) {
      updateBundle.mutate(
        {
          bundleId: bundle.id,
          productId: bundle.product_id,
          productData,
          bundleType: form.bundle_type,
          items: bundleItems,
        },
        {
          onSuccess: async () => {
            await setProductCategories.mutateAsync({
              productId: bundle.product_id,
              categoryIds: allCategoryIds,
            });
            navigate("/crm/inventory/bundles");
          },
        }
      );
    } else if (fromProductId) {
      // Converting existing product to bundle — update the product, then create bundle record
      const convertToBundle = async () => {
        try {
          // Update the existing product with form data
          const { error: updateErr } = await supabase
            .from("products")
            .update({ ...productData })
            .eq("id", fromProductId);
          if (updateErr) throw updateErr;

          // Create bundle record linking to existing product
          const { data: newBundle, error: bErr } = await supabase
            .from("bundles")
            .insert({ product_id: fromProductId, bundle_type: form.bundle_type })
            .select()
            .single();
          if (bErr) throw bErr;

          // Insert bundle items
          if (bundleItems.length > 0) {
            const { error: iErr } = await supabase
              .from("bundle_items")
              .insert(bundleItems.map(item => ({ ...item, bundle_id: newBundle.id })));
            if (iErr) throw iErr;
          }

          await setProductCategories.mutateAsync({
            productId: fromProductId,
            categoryIds: allCategoryIds,
          });

          toast.success("הפריט הועבר למארז בהצלחה");
          navigate("/crm/inventory/bundles");
        } catch (err: any) {
          console.error("Convert to bundle error:", err);
          toast.error(`שגיאה בהמרה למארז: ${err?.message || "unknown"}`);
        }
      };
      convertToBundle();
    } else {
      createBundle.mutate(
        {
          productData,
          bundleType: form.bundle_type,
          items: bundleItems,
        },
        {
          onSuccess: async (newBundle: any) => {
            if (newBundle?.product_id && allCategoryIds.length > 0) {
              await setProductCategories.mutateAsync({
                productId: newBundle.product_id,
                categoryIds: allCategoryIds,
              });
            }
            navigate("/crm/inventory/bundles");
          },
        }
      );
    }
  };

  const isPending = createBundle.isPending || updateBundle.isPending;

  return (
   <div className="space-y-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/inventory/bundles")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">{isEditing ? "עריכת מארז" : "מארז חדש"}</h1>
        </div>
        <Button onClick={handleSave} disabled={!form.name || isPending} size="sm">
          {isPending ? "שומר..." : "שמור"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {/* Details */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">שם (עברית)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">اسم (ערבית)</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" className="h-9" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">מק״ט</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" placeholder="e.g. BND-001" className="h-9" />
              </div>
              {/* Categories — multi-select chips. First selected = primary */}
              <div className="space-y-1">
                <Label className="text-xs">קטגוריות (ניתן לבחור כמה)</Label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[44px]">
                  {(categories || []).map((c) => {
                    const idx = selectedCategoryIds.indexOf(c.id);
                    const selected = idx >= 0;
                    const isPrimary = idx === 0;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() =>
                          setSelectedCategoryIds((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          )
                        }
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          isPrimary
                            ? "bg-primary text-primary-foreground border-primary font-semibold"
                            : selected
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-background hover:bg-accent"
                        }`}
                        title={isPrimary ? "קטגוריה ראשית" : selected ? "מסומן" : "לא מסומן"}
                      >
                        {isPrimary && "★ "}{c.name}
                      </button>
                    );
                  })}
                  {(categories?.length || 0) === 0 && (
                    <span className="text-xs text-muted-foreground">אין קטגוריות זמינות</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">הקטגוריה הראשונה שתבחר היא הקטגוריה הראשית (★).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">תיאור קצר (עברית)</Label>
                  <RichTextEditor value={form.short_description} onChange={(v) => setForm({ ...form, short_description: v })} rows={2} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">وصف مختصر (ערבית)</Label>
                  <RichTextEditor value={form.short_description_ar} onChange={(v) => setForm({ ...form, short_description_ar: v })} rows={2} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">תיאור מלא (עברית)</Label>
                  <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={4} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">وصف كامل (ערבית)</Label>
                  <RichTextEditor value={form.description_ar} onChange={(v) => setForm({ ...form, description_ar: v })} rows={4} dir="rtl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bundle Items — simple */}
          {form.bundle_type === "simple_bundle" && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <Label className="text-sm font-semibold">פריטים במארז</Label>
                <Input
                  placeholder="חפש מוצר..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="מוצר" /></SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {variations && variations.length > 0 && (
                    <Select onValueChange={addItem}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="וריאציה" /></SelectTrigger>
                      <SelectContent>
                        {variations.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div key={item.variation_id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <span className="flex-1 text-xs font-medium truncate">{item.label}</span>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.variation_id, Number(e.target.value))}
                          className="w-16 h-8 text-xs"
                          min={1}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.variation_id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bundle Variations */}
          {form.bundle_type === "variable_bundle" && isEditing && bundle && (
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-semibold mb-3 block">וריאציות מארז</Label>
                <BundleVariationsManager bundleId={bundle.id} />
              </CardContent>
            </Card>
          )}
          {form.bundle_type === "variable_bundle" && !isEditing && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground text-center py-3">שמור תחילה כדי להוסיף וריאציות</p>
              </CardContent>
            </Card>
          )}

          {isEditing && bundle && (
            <Card>
              <CardContent className="pt-4">
                <Label className="text-sm font-semibold mb-3 block">מוצרים קשורים</Label>
                <RelatedProductsManager productId={bundle.product_id} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Image + Prices + Settings in one compact card on desktop */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Image */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">תמונה</Label>
                {form.image_url && (
                  <img src={form.image_url} alt="מארז" className="w-full h-32 object-cover rounded-md border" />
                )}
                <Label htmlFor="bundle-image-upload" className="flex items-center gap-2 cursor-pointer justify-center p-2 border-2 border-dashed rounded-md hover:bg-accent transition-colors text-xs">
                  <Upload className="h-3 w-3" />
                  {uploading ? "מעלה..." : "העלה תמונה"}
                </Label>
                <input id="bundle-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </div>

              {/* Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">גלריה ({galleryImages.length})</Label>
                  <Label htmlFor="bundle-gallery-upload" className="text-xs text-primary cursor-pointer hover:underline">
                    {uploadingGallery ? "מעלה..." : "+ הוסף תמונות"}
                  </Label>
                  <input id="bundle-gallery-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
                </div>
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.src} alt={`גלריה ${i + 1}`} className="w-full h-16 object-cover rounded-md border border-border" />
                        <button
                          type="button"
                          onClick={() => setGalleryImages(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">מחירים</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">מכירה</Label>
                    <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">עלות</Label>
                    <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">משלוח</Label>
                    <Input type="number" value={form.shipping_price} onChange={(e) => setForm({ ...form, shipping_price: Number(e.target.value) })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">הגדרות</Label>
                <Select value={form.bundle_type} onValueChange={(v: "simple_bundle" | "variable_bundle") => setForm({ ...form, bundle_type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple_bundle">פשוט</SelectItem>
                    <SelectItem value="variable_bundle">עם וריאציות</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">מפורסם באתר</Label>
                  <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky bottom save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-3 flex items-center justify-between" dir="rtl">
        <span className="text-sm text-muted-foreground truncate">{form.name || "מארז חדש"}</span>
        <Button onClick={handleSave} disabled={!form.name || isPending}>
          {isPending ? "שומר..." : "שמור מארז"}
        </Button>
      </div>
    </div>
  );
};

export default BundleForm;

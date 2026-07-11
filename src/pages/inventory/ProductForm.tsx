import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, RefreshCw, Upload, Package, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useProductCategories, useSetProductCategories } from "@/hooks/useProductCategories";
import { VariationsManager } from "@/components/inventory/VariationsManager";
import { syncProductToWoo } from "@/lib/wooProductSync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { data: product } = useProduct(id);
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: existingCategoryIds } = useProductCategories(id);
  const setProductCategories = useSetProductCategories();
  // Unified multi-select; first selected = primary
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

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
    compare_at_price: 0,
    shipping_price: 0,
    category_id: "" as string | null,
    product_type: "simple" as "simple" | "variable",
    is_published: false,
    image_url: "" as string | null,
  });

  const [galleryImages, setGalleryImages] = useState<{ src: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        name_ar: (product as any).name_ar || "",
        sku: product.sku || "",
        description: product.description || "",
        description_ar: (product as any).description_ar || "",
        short_description: product.short_description || "",
        short_description_ar: (product as any).short_description_ar || "",
        sale_price: Number(product.sale_price),
        cost_price: Number(product.cost_price),
        compare_at_price: Number((product as any).compare_at_price || 0),
        shipping_price: Number((product as any).shipping_price || 0),
        category_id: product.category_id,
        product_type: product.product_type,
        is_published: product.is_published,
        image_url: product.image_url,
      });
      if (product.gallery_images && Array.isArray(product.gallery_images)) {
        setGalleryImages((product.gallery_images as { src: string }[]).filter(img => img.src));
      }
    }
  }, [product]);

  // Initialise multi-select from join table; fall back to single category_id for legacy data
  useEffect(() => {
    if (existingCategoryIds && existingCategoryIds.length > 0) {
      setSelectedCategoryIds(existingCategoryIds);
    } else if (product?.category_id) {
      setSelectedCategoryIds([product.category_id]);
    }
  }, [existingCategoryIds, product?.category_id]);

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

  const handleSave = () => {
    // Unified selection; first selected = primary category
    const allCategoryIds = Array.from(new Set(selectedCategoryIds));
    const primaryCategoryId = allCategoryIds[0] || null;

    const data = {
      ...form,
      compare_at_price: form.compare_at_price > 0 ? form.compare_at_price : null,
      category_id: primaryCategoryId,
      gallery_images: galleryImages,
    };

    const persistCategories = async (productId: string) => {
      try {
        await setProductCategories.mutateAsync({ productId, categoryIds: allCategoryIds });
      } catch (err) {
        console.error("Failed to save categories", err);
      }
    };

    if (isEditing) {
      updateProduct.mutate({ id, ...data } as any, {
        onSuccess: async () => {
          await persistCategories(id!);
          navigate("/crm/inventory/products");
        },
      });
    } else {
      createProduct.mutate(data as any, {
        onSuccess: async (created: any) => {
          if (created?.id) await persistCategories(created.id);
          navigate("/crm/inventory/products");
        },
      });
    }
  };

  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!id) return;
    setSyncing(true);
    try {
      await syncProductToWoo(id);
      toast.success("סנכרון לוו הושלם");
    } catch {
      toast.error("שגיאה בסנכרון");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/inventory/products")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? "עריכת פריט" : "הוספת פריט חדש"}</h1>
          {isEditing && (
            <Badge variant={product?.woo_id ? "default" : "secondary"} className="mr-2">
              {product?.woo_id ? "מסונכרן לוו" : "לא מסונכרן"}
            </Badge>
          )}
        </div>
        {isEditing && id && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/crm/inventory/products/${id}/performance`)}>
              <BarChart3 className="h-4 w-4 ml-1" />
              ביצועים
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/crm/inventory/bundles/new?fromProduct=${id}`)}>
              <Package className="h-4 w-4 ml-1" />
              העבר למארז
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>פרטי הפריט</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם הפריט (עברית)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>اسم المنتج (ערבית)</Label>
                  <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>מק״ט</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" placeholder="e.g. SKU-001" />
              </div>
              {/* Categories — multi-select chips. First selected = primary */}
              <div className="space-y-1">
                <Label>קטגוריות (ניתן לבחור כמה)</Label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תיאור קצר (עברית)</Label>
                  <RichTextEditor value={form.short_description} onChange={(v) => setForm({ ...form, short_description: v })} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>وصف مختصر (ערבית)</Label>
                  <RichTextEditor value={form.short_description_ar} onChange={(v) => setForm({ ...form, short_description_ar: v })} rows={3} dir="rtl" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תיאור מלא (עברית)</Label>
                  <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={6} />
                </div>
                <div className="space-y-2">
                  <Label>وصف كامل (ערבית)</Label>
                  <RichTextEditor value={form.description_ar} onChange={(v) => setForm({ ...form, description_ar: v })} rows={6} dir="rtl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {isEditing && id && form.product_type === "variable" && (
            <Card>
              <CardContent className="pt-6">
                <VariationsManager productId={id!} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Image Upload */}
          <Card>
            <CardHeader><CardTitle>תמונות</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.image_url && (
                <img src={form.image_url} alt="תמונת מוצר" className="w-full h-40 object-cover rounded-lg border" />
              )}
              <Label htmlFor="image-upload" className="flex items-center gap-2 cursor-pointer justify-center p-3 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "מעלה..." : "העלה תמונה"}
              </Label>
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              {/* Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">גלריה ({galleryImages.length} תמונות)</Label>
                  <Label htmlFor="gallery-upload" className="text-xs text-primary cursor-pointer hover:underline">
                    {uploadingGallery ? "מעלה..." : "+ הוסף תמונות"}
                  </Label>
                  <input id="gallery-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
                </div>
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.src} alt={`גלריה ${i + 1}`} className="w-full h-20 object-cover rounded-md border border-border" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>מחירים</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>מחיר מכירה</Label>
                <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>מחיר לפני מבצע (אופציונלי)</Label>
                <Input type="number" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: Number(e.target.value) })} placeholder="0 = בלי מבצע" />
                <p className="text-xs text-muted-foreground">כאשר גבוה ממחיר המכירה, יוצג באתר כמחיר לפני הנחה (עם קו חוצה) ותג הנחה באחוזים.</p>
              </div>
              <div className="space-y-2">
                <Label>מחיר עלות (ללא מע״מ)</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">* מחיר העלות הוא תמיד ללא מע״מ</p>
              </div>
              <div className="space-y-2">
                <Label>מחיר משלוח</Label>
                <Input type="number" value={form.shipping_price} onChange={(e) => setForm({ ...form, shipping_price: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">* עלות המשלוח = המקסימום מבין כל הפריטים בסל</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>הגדרות</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>סוג מוצר</Label>
                <Select value={form.product_type} onValueChange={(v: "simple" | "variable") => setForm({ ...form, product_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">פשוט</SelectItem>
                    <SelectItem value="variable">עם וריאציות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>מפורסם באתר</Label>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={!form.name || createProduct.isPending || updateProduct.isPending}>
            {createProduct.isPending || updateProduct.isPending ? "שומר..." : "שמור"}
          </Button>
          {isEditing && (
            <Button variant="outline" className="w-full" onClick={handleManualSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ml-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "מסנכרן..." : "סנכרן לוו"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductForm;

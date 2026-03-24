import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
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
    product_type: "simple" as "simple" | "variable",
    is_published: false,
    image_url: "" as string | null,
  });

  const [uploading, setUploading] = useState(false);

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
        category_id: product.category_id,
        product_type: product.product_type,
        is_published: product.is_published,
        image_url: product.image_url,
      });
    }
  }, [product]);

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

  const handleSave = () => {
    const data = {
      ...form,
      category_id: form.category_id || null,
    };
    if (isEditing) {
      updateProduct.mutate({ id, ...data } as any, { onSuccess: () => navigate("/inventory/products") });
    } else {
      createProduct.mutate(data as any, { onSuccess: () => navigate("/inventory/products") });
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/products")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditing ? "עריכת פריט" : "הוספת פריט חדש"}</h1>
        {isEditing && (
          <Badge variant={product?.woo_id ? "default" : "secondary"} className="mr-2">
            {product?.woo_id ? "מסונכרן לוו" : "לא מסונכרן"}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>פרטי הפריט</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם הפריט (עברית)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>اسم المنتج (ערבית)</Label>
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

          {isEditing && form.product_type === "variable" && (
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
            <CardHeader><CardTitle>תמונה</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.image_url && (
                <img src={form.image_url} alt="תמונת מוצר" className="w-full h-40 object-cover rounded-lg border" />
              )}
              <Label htmlFor="image-upload" className="flex items-center gap-2 cursor-pointer justify-center p-3 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                <Upload className="h-4 w-4" />
                {uploading ? "מעלה..." : "העלה תמונה"}
              </Label>
              <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
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
                <Label>מחיר עלות (ללא מע״מ)</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">* מחיר העלות הוא תמיד ללא מע״מ</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>הגדרות</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>סוג מוצר</Label>
                <Select value={form.product_type} onValueChange={(v: "simple" | "variable") => setForm({ ...form, product_type: v })} disabled={isEditing}>
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

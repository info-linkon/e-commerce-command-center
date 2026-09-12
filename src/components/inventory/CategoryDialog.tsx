import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { normalizeSlug } from "@/lib/slug";

type Category = Tables<"categories">;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: {
    name: string;
    name_he: string | null;
    slug: string | null;
    display_order: number;
    image_url: string | null;
    meta_title: string | null;
    meta_title_he: string | null;
    meta_description: string | null;
    meta_description_he: string | null;
  }) => void;
  loading?: boolean;
}

export function CategoryDialog({ open, onOpenChange, category, onSave, loading }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [nameHe, setNameHe] = useState((category as any)?.name_he ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [displayOrder, setDisplayOrder] = useState(category?.display_order ?? 0);
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [metaTitle, setMetaTitle] = useState((category as any)?.meta_title ?? "");
  const [metaTitleHe, setMetaTitleHe] = useState((category as any)?.meta_title_he ?? "");
  const [metaDesc, setMetaDesc] = useState((category as any)?.meta_description ?? "");
  const [metaDescHe, setMetaDescHe] = useState((category as any)?.meta_description_he ?? "");
  const [uploading, setUploading] = useState(false);

  // Sync form state whenever the dialog is opened OR the target category changes
  // (e.g. user clicks "edit" on a different row while the dialog is already open).
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setNameHe((category as any)?.name_he ?? "");
      setSlug(category?.slug ?? "");
      setDisplayOrder(category?.display_order ?? 0);
      setImageUrl(category?.image_url ?? null);
      setMetaTitle((category as any)?.meta_title ?? "");
      setMetaTitleHe((category as any)?.meta_title_he ?? "");
      setMetaDesc((category as any)?.meta_description ?? "");
      setMetaDescHe((category as any)?.meta_description_he ?? "");
    }
  }, [open, category?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `categories/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(publicUrl);
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{category ? "עריכת קטגוריה" : "הוספת קטגוריה"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">שם הקטגוריה (ערבית)</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: سيجار" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-name-he">שם הקטגוריה (עברית)</Label>
            <Input id="cat-name-he" value={nameHe} onChange={(e) => setNameHe(e.target.value)} placeholder="למשל: סיגרים" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-slug">כתובת מותאמת בקישור (slug)</Label>
            <Input
              id="cat-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={(e) => setSlug(normalizeSlug(e.target.value))}
              dir="ltr"
              placeholder="my-category"
            />
            <p className="text-xs text-muted-foreground" dir="ltr">
              https://elwejha.co.il/category/{normalizeSlug(slug) || category?.category_number || "1"}
            </p>
            <p className="text-xs text-muted-foreground">אם נשאר ריק — הקישור יעבוד לפי מספר הקטגוריה. קישורים ישנים ימשיכו לעבוד.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order">סדר תצוגה</Label>
            <Input id="order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>תמונת קטגוריה</Label>
            {imageUrl ? (
              <div className="relative w-24 h-24 rounded-md overflow-hidden border">
                <img src={imageUrl} alt="category" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors w-fit">
                <Upload className="h-4 w-4" />
                {uploading ? "מעלה..." : "העלה תמונה"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="text-base">כותרת ותיאור לגוגל (SEO)</Label>
              <p className="text-xs text-muted-foreground">
                אם נשאר ריק — הכותרת תהיה אוטומטית: "אתר אלוג'הא - {nameHe || name || "שם הקטגוריה"}".
              </p>
            </div>
            <div className="space-y-2">
              <Label>כותרת לגוגל (עברית)</Label>
              <Input value={metaTitleHe} onChange={(e) => setMetaTitleHe(e.target.value)} maxLength={70} />
            </div>
            <div className="space-y-2">
              <Label>عنوان جوجل (ערבית)</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>תיאור לגוגל (עברית)</Label>
              <Textarea value={metaDescHe} onChange={(e) => setMetaDescHe(e.target.value)} maxLength={160} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>وصف جوجل (ערבית)</Label>
              <Textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={160} rows={3} dir="rtl" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button
            onClick={() =>
              onSave({
                name,
                name_he: nameHe || null,
                slug: normalizeSlug(slug) || null,
                display_order: displayOrder,
                image_url: imageUrl,
                meta_title: metaTitle.trim() || null,
                meta_title_he: metaTitleHe.trim() || null,
                meta_description: metaDesc.trim() || null,
                meta_description_he: metaDescHe.trim() || null,
              })
            }
            disabled={!name || loading || uploading}
          >
            {loading ? "שומר..." : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

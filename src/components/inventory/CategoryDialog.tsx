import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

type Category = Tables<"categories">;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: { name: string; display_order: number; image_url: string | null }) => void;
  loading?: boolean;
}

export function CategoryDialog({ open, onOpenChange, category, onSave, loading }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(category?.display_order ?? 0);
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_url ?? null);
  const [uploading, setUploading] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(category?.name ?? "");
      setDisplayOrder(category?.display_order ?? 0);
      setImageUrl(category?.image_url ?? null);
    }
    onOpenChange(isOpen);
  };

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
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{category ? "עריכת קטגוריה" : "הוספת קטגוריה"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">שם הקטגוריה</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: סיגרים" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => onSave({ name, display_order: displayOrder, image_url: imageUrl })} disabled={!name || loading || uploading}>
            {loading ? "שומר..." : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

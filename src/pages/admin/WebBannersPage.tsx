import { useBannersAdmin, useCreateBanner, useUpdateBanner, useDeleteBanner } from "@/hooks/useBannersPublic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Pencil, ImagePlus, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

interface BannerForm {
  title: string;
  title_he: string;
  subtitle: string;
  subtitle_he: string;
  badge: string;
  badge_he: string;
  description: string;
  description_he: string;
  image_url: string;
  link: string;
}

const linkOptions = [
  { value: "/shop", label: "חנות" },
  { value: "/about", label: "אודות" },
  { value: "/contact", label: "צור קשר" },
  { value: "/faq", label: "שאלות נפוצות" },
];

const emptyForm: BannerForm = { title: "", title_he: "", subtitle: "", subtitle_he: "", badge: "", badge_he: "", description: "", description_he: "", image_url: "", link: "" };

export default function WebBannersPage() {
  const { data: banners, isLoading } = useBannersAdmin();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (banner: any) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || "",
      title_he: banner.title_he || "",
      subtitle: banner.subtitle || "",
      subtitle_he: banner.subtitle_he || "",
      badge: banner.badge || "",
      badge_he: banner.badge_he || "",
      description: banner.description || "",
      description_he: banner.description_he || "",
      image_url: banner.image_url || "",
      link: banner.link || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
    if (error) {
      toast.error('שגיאה בהעלאת התמונה');
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleSave = () => {
    if (editingId) {
      updateBanner.mutate({ id: editingId, ...form }, {
        onSuccess: () => { setDialogOpen(false); setEditingId(null); },
      });
    } else {
      createBanner.mutate(form, {
        onSuccess: () => { setDialogOpen(false); setForm(emptyForm); },
      });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!banners || index <= 0 || reordering) return;
    setReordering(true);
    const current = banners[index];
    const prev = banners[index - 1];
    await Promise.all([
      supabase.from("banners").update({ sort_order: prev.sort_order }).eq("id", current.id),
      supabase.from("banners").update({ sort_order: current.sort_order }).eq("id", prev.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["banners"] });
    setReordering(false);
  };

  const handleMoveDown = async (index: number) => {
    if (!banners || index >= banners.length - 1 || reordering) return;
    setReordering(true);
    const current = banners[index];
    const next = banners[index + 1];
    await Promise.all([
      supabase.from("banners").update({ sort_order: next.sort_order }).eq("id", current.id),
      supabase.from("banners").update({ sort_order: current.sort_order }).eq("id", next.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["banners"] });
    setReordering(false);
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">ניהול באנרים</h1>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> הוסף באנר</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !banners?.length ? (
        <p className="text-muted-foreground">אין באנרים עדיין</p>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div key={banner.id} className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
              <div className="flex flex-col gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0 || reordering}
                  onClick={() => handleMoveUp(index)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === banners.length - 1 || reordering}
                  onClick={() => handleMoveDown(index)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              {banner.image_url && (
                <img src={banner.image_url} alt="" className="w-24 h-14 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{banner.title || "ללא כותרת"}</p>
                <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
                {banner.link && <p className="text-xs text-muted-foreground" dir="ltr">{banner.link}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0" style={{ direction: "ltr" }}>
                <Switch
                  checked={banner.active}
                  onCheckedChange={(checked) => updateBanner.mutate({ id: banner.id, active: checked })}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(banner)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteBanner.mutate(banner.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת באנר" : "באנר חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת (ערבית)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" dir="rtl" />
            </div>
            <div>
              <Label>כותרת (עברית)</Label>
              <Input value={form.title_he} onChange={(e) => setForm({ ...form, title_he: e.target.value })} className="mt-1" dir="rtl" />
            </div>
            <div>
              <Label>תת כותרת (ערבית)</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1" dir="rtl" />
            </div>
            <div>
              <Label>תת כותרת (עברית)</Label>
              <Input value={form.subtitle_he} onChange={(e) => setForm({ ...form, subtitle_he: e.target.value })} className="mt-1" dir="rtl" />
            </div>
            <div>
              <Label>תג/באדג׳ (ערבית)</Label>
              <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="mt-1" dir="rtl" placeholder="أهلاً بك في الوجهة" />
            </div>
            <div>
              <Label>תג/באדג׳ (עברית)</Label>
              <Input value={form.badge_he} onChange={(e) => setForm({ ...form, badge_he: e.target.value })} className="mt-1" dir="rtl" placeholder="ברוכים הבאים ליעד" />
            </div>
            <div>
              <Label>תיאור (ערבית)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" dir="rtl" placeholder="مستلزمات تخييم ورحلات..." />
            </div>
            <div>
              <Label>תיאור (עברית)</Label>
              <Input value={form.description_he} onChange={(e) => setForm({ ...form, description_he: e.target.value })} className="mt-1" dir="rtl" placeholder="ציוד קמפינג וטיולים..." />
            </div>
            <div>
              <Label>תמונה</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && (
                  <img src={form.image_url} alt="" className="w-24 h-14 object-cover rounded border border-border" />
                )}
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  <span>{uploading ? "מעלה..." : "העלה תמונה"}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                  }} />
                </label>
              </div>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="או הדבק כתובת URL"
                className="mt-2"
                dir="ltr"
              />
            </div>
            <div>
              <Label>קישור</Label>
              <Select value={form.link} onValueChange={(v) => setForm({ ...form, link: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר דף" />
                </SelectTrigger>
                <SelectContent>
                  {linkOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="או הקלד קישור מותאם"
                className="mt-2"
                dir="ltr"
              />
            </div>
            <Button onClick={handleSave} disabled={createBanner.isPending || updateBanner.isPending} className="w-full">
              {(createBanner.isPending || updateBanner.isPending) ? "שומר..." : editingId ? "שמור שינויים" : "צור באנר"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

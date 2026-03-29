import { useBannersAdmin, useCreateBanner, useUpdateBanner, useDeleteBanner } from "@/hooks/useBannersPublic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function WebBannersPage() {
  const { data: banners, isLoading } = useBannersAdmin();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", image_url: "", link: "" });

  const handleCreate = () => {
    createBanner.mutate(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ title: "", subtitle: "", image_url: "", link: "" });
      },
    });
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">ניהול באנרים</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> הוסף באנר</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>באנר חדש</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="כותרת" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="תת כותרת" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              <Input placeholder="URL תמונה" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <Input placeholder="קישור" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              <Button onClick={handleCreate} disabled={createBanner.isPending} className="w-full">
                {createBanner.isPending ? "יוצר..." : "צור באנר"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : !banners?.length ? (
        <p className="text-muted-foreground">אין באנרים עדיין</p>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center gap-4 bg-card p-4 rounded-lg border">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              {banner.image_url && (
                <img src={banner.image_url} alt="" className="w-20 h-12 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{banner.title || "ללא כותרת"}</p>
                <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
              </div>
              <div className="flex items-center gap-3" style={{ direction: "ltr" }}>
                <Switch
                  checked={banner.active}
                  onCheckedChange={(checked) => updateBanner.mutate({ id: banner.id, active: checked })}
                />
              </div>
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
    </div>
  );
}

import { useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProductVariations, useCreateVariation, useUpdateVariation, useDeleteVariation } from "@/hooks/useProducts";
import { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Variation = Tables<"product_variations">;

interface VariationsManagerProps {
  productId: string;
}

export function VariationsManager({ productId }: VariationsManagerProps) {
  const { data: variations, isLoading } = useProductVariations(productId);
  const createVariation = useCreateVariation();
  const updateVariation = useUpdateVariation();
  const deleteVariation = useDeleteVariation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Variation | null>(null);
  const [form, setForm] = useState({ name: "", name_ar: "", sku: "", price: 0, compare_at_price: 0, cost_price: 0, image_url: "" as string | null });
  const [uploading, setUploading] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", name_ar: "", sku: "", price: 0, compare_at_price: 0, cost_price: 0, image_url: null });
    setDialogOpen(true);
  };

  const openEdit = (v: Variation) => {
    setEditing(v);
    setForm({ name: v.name, name_ar: v.name_ar || "", sku: v.sku || "", price: Number(v.price), compare_at_price: Number((v as any).compare_at_price || 0), cost_price: Number(v.cost_price), image_url: v.image_url || null });
    setDialogOpen(true);
  };

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
      setForm(f => ({ ...f, image_url: publicUrl }));
      toast.success("התמונה הועלתה");
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      name_ar: form.name_ar || null,
      sku: form.sku,
      price: form.price,
      compare_at_price: form.compare_at_price > 0 ? form.compare_at_price : null,
      cost_price: form.cost_price,
      image_url: form.image_url,
    };
    if (editing) {
      updateVariation.mutate({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createVariation.mutate({ product_id: productId, ...payload }, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">וריאציות</h3>
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="ml-1 h-3 w-3" />
          הוסף וריאציה
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right w-12">תמונה</TableHead>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">מק״ט</TableHead>
              <TableHead className="text-right">מחיר</TableHead>
              <TableHead className="text-right">עלות</TableHead>
              <TableHead className="text-right w-20">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !variations?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">אין וריאציות</TableCell></TableRow>
            ) : (
              variations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {v.image_url ? (
                      <img src={v.image_url} alt={v.name} className="w-8 h-8 object-cover rounded border" />
                    ) : (
                      <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.sku || "—"}</TableCell>
                  <TableCell>₪{Number(v.price).toFixed(2)}</TableCell>
                  <TableCell>₪{Number(v.cost_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteVariation.isPending}
                        onClick={() => {
                          if (confirm(`למחוק את הוריאציה "${v.name}"?`)) {
                            deleteVariation.mutate({ id: v.id, productId });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת וריאציה" : "הוספת וריאציה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Image */}
            <div className="space-y-2">
              <Label>תמונה</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <div className="relative group">
                    <img src={form.image_url} alt="תמונת וריאציה" className="w-16 h-16 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, image_url: null }))}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
                <Label htmlFor={`var-img-${editing?.id || 'new'}`} className="flex items-center gap-1 cursor-pointer text-xs text-primary hover:underline">
                  <Upload className="h-3 w-3" />
                  {uploading ? "מעלה..." : "העלה תמונה"}
                </Label>
                <input id={`var-img-${editing?.id || 'new'}`} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>שם (עברית)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>اسم (ערבית)</Label>
              <Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>מק״ט</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" placeholder="e.g. SKU-001" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>מחיר מכירה</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>מחיר עלות (ללא מע״מ)</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>מחיר לפני מבצע (אופציונלי)</Label>
              <Input type="number" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: Number(e.target.value) })} placeholder="0 = בלי מבצע" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={!form.name}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
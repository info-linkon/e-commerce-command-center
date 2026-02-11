import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProductVariations, useCreateVariation, useUpdateVariation, useDeleteVariation } from "@/hooks/useProducts";
import { Tables } from "@/integrations/supabase/types";

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
  const [form, setForm] = useState({ name: "", sku: "", price: 0, cost_price: 0 });

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sku: "", price: 0, cost_price: 0 });
    setDialogOpen(true);
  };

  const openEdit = (v: Variation) => {
    setEditing(v);
    setForm({ name: v.name, sku: v.sku || "", price: Number(v.price), cost_price: Number(v.cost_price) });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateVariation.mutate({ id: editing.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createVariation.mutate({ product_id: productId, ...form }, { onSuccess: () => setDialogOpen(false) });
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
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">מק״ט</TableHead>
              <TableHead className="text-right">מחיר</TableHead>
              <TableHead className="text-right">עלות</TableHead>
              <TableHead className="text-right w-20">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !variations?.length ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">אין וריאציות</TableCell></TableRow>
            ) : (
              variations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.sku || "—"}</TableCell>
                  <TableCell>₪{Number(v.price).toFixed(2)}</TableCell>
                  <TableCell>₪{Number(v.cost_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteVariation.mutate({ id: v.id, productId })}>
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
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "עריכת וריאציה" : "הוספת וריאציה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>מק״ט</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>מחיר מכירה</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>מחיר עלות</Label>
                <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
              </div>
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

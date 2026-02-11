import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: { name: string; display_order: number }) => void;
  loading?: boolean;
}

export function CategoryDialog({ open, onOpenChange, category, onSave, loading }: CategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(category?.display_order ?? 0);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(category?.name ?? "");
      setDisplayOrder(category?.display_order ?? 0);
    }
    onOpenChange(isOpen);
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => onSave({ name, display_order: displayOrder })} disabled={!name || loading}>
            {loading ? "שומר..." : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

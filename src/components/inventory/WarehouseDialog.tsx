import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tables } from "@/integrations/supabase/types";

type Warehouse = Tables<"warehouses">;

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null;
  onSave: (data: { name: string; address: string; is_active: boolean }) => void;
  loading?: boolean;
}

export function WarehouseDialog({ open, onOpenChange, warehouse, onSave, loading }: WarehouseDialogProps) {
  const [name, setName] = useState(warehouse?.name ?? "");
  const [address, setAddress] = useState(warehouse?.address ?? "");
  const [isActive, setIsActive] = useState(warehouse?.is_active ?? true);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(warehouse?.name ?? "");
      setAddress(warehouse?.address ?? "");
      setIsActive(warehouse?.is_active ?? true);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{warehouse ? "עריכת מחסן" : "הוספת מחסן"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המחסן</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: מחסן ראשי" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">כתובת</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת המחסן" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">פעיל</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={() => onSave({ name, address, is_active: isActive })} disabled={!name || loading}>
            {loading ? "שומר..." : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

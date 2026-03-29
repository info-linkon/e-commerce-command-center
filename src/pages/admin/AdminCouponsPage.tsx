import { useState } from "react";
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, Coupon } from "@/hooks/useCoupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Loader2, Ticket } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface CouponForm {
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number | null;
  single_use: boolean;
  active: boolean;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: "",
  type: "percentage",
  value: 0,
  min_order: 0,
  max_uses: null,
  single_use: false,
  active: true,
  expires_at: "",
};

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      min_order: coupon.min_order,
      max_uses: coupon.max_uses,
      single_use: coupon.single_use,
      active: coupon.active,
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload: any = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: form.value,
      min_order: form.min_order,
      max_uses: form.max_uses || null,
      single_use: form.single_use,
      active: form.active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    if (editingId) {
      updateCoupon.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { setDialogOpen(false); setEditingId(null); },
      });
    } else {
      createCoupon.mutate(payload, {
        onSuccess: () => { setDialogOpen(false); setForm(emptyForm); },
      });
    }
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול קופונים</h1>
          <p className="text-sm text-muted-foreground mt-1">יצירה ועריכה של קודי הנחה לאתר</p>
        </div>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" /> קופון חדש</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !coupons?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין קופונים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground text-lg">{coupon.code}</span>
                  <Badge variant={coupon.active ? "default" : "secondary"}>
                    {coupon.active ? "פעיל" : "מושבת"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {coupon.type === "percentage" ? `${coupon.value}% הנחה` : `₪${coupon.value} הנחה`}
                  {coupon.min_order > 0 && ` · מינימום ₪${coupon.min_order}`}
                  {coupon.max_uses && ` · ${coupon.used_count}/${coupon.max_uses} שימושים`}
                  {coupon.expires_at && ` · עד ${format(new Date(coupon.expires_at), "dd/MM/yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={coupon.active}
                  onCheckedChange={(checked) => updateCoupon.mutate({ id: coupon.id, active: checked })}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(coupon)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteCoupon.mutate(coupon.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת קופון" : "קופון חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>קוד קופון</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="mt-1 font-mono"
                dir="ltr"
                placeholder="SUMMER25"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג הנחה</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">אחוזים (%)</SelectItem>
                    <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ערך</Label>
                <Input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סכום מינימלי להזמנה</Label>
                <Input
                  type="number"
                  value={form.min_order}
                  onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>מקסימום שימושים</Label>
                <Input
                  type="number"
                  value={form.max_uses || ""}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1"
                  dir="ltr"
                  placeholder="ללא הגבלה"
                />
              </div>
            </div>
            <div>
              <Label>תאריך תפוגה</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>שימוש חד פעמי</Label>
              <Switch checked={form.single_use} onCheckedChange={(v) => setForm({ ...form, single_use: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>פעיל</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
            <Button onClick={handleSave} disabled={createCoupon.isPending || updateCoupon.isPending} className="w-full">
              {(createCoupon.isPending || updateCoupon.isPending) ? "שומר..." : editingId ? "שמור שינויים" : "צור קופון"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventoryTransfers, useCreateTransfer } from "@/hooks/useInventoryTransfers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransferItem {
  variation_id: string;
  variation_name: string;
  product_name: string;
  quantity: number;
}

const TransfersPage = () => {
  const [open, setOpen] = useState(false);
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [selectedVariation, setSelectedVariation] = useState("");

  const { data: warehouses } = useWarehouses();
  const { data: transfers, isLoading } = useInventoryTransfers();
  const createTransfer = useCreateTransfer();

  const { data: variations } = useQuery({
    queryKey: ["all-variations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*, products(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const addItem = () => {
    if (!selectedVariation) return;
    if (items.find((i) => i.variation_id === selectedVariation)) {
      toast.error("הפריט כבר ברשימה");
      return;
    }
    const v = variations?.find((v) => v.id === selectedVariation);
    if (!v) return;
    setItems([...items, {
      variation_id: v.id,
      variation_name: v.name,
      product_name: (v.products as any)?.name || "",
      quantity: 1,
    }]);
    setSelectedVariation("");
  };

  const handleSubmit = async () => {
    if (!fromWarehouse || !toWarehouse) { toast.error("בחר מחסנים"); return; }
    if (fromWarehouse === toWarehouse) { toast.error("המחסנים חייבים להיות שונים"); return; }
    if (items.length === 0) { toast.error("הוסף פריטים"); return; }

    await createTransfer.mutateAsync({
      from_warehouse_id: fromWarehouse,
      to_warehouse_id: toWarehouse,
      notes: notes || undefined,
      items: items.map((i) => ({ variation_id: i.variation_id, quantity: i.quantity })),
    });

    setOpen(false);
    setItems([]);
    setFromWarehouse("");
    setToWarehouse("");
    setNotes("");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6" />
          <h1 className="text-2xl font-bold">העברות מלאי</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-1" />העברה חדשה</Button>
          </DialogTrigger>
           <DialogContent className="max-w-2xl w-[95vw]" dir="rtl">
            <DialogHeader><DialogTitle>העברת מלאי</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">ממחסן</label>
                  <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                    <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter((w) => w.is_active).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">למחסן</label>
                  <Select value={toWarehouse} onValueChange={setToWarehouse}>
                    <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
                    <SelectContent>
                      {warehouses?.filter((w) => w.is_active).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedVariation} onValueChange={setSelectedVariation}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="בחר פריט..." /></SelectTrigger>
                  <SelectContent>
                    {variations?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {(v.products as any)?.name} — {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addItem} disabled={!selectedVariation}>
                  <Plus className="h-4 w-4 ml-1" />הוסף
                </Button>
              </div>

              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">מוצר</TableHead>
                      <TableHead className="text-right">וריאציה</TableHead>
                      <TableHead className="text-right">כמות</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.variation_id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.variation_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                            className="w-20 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Textarea placeholder="הערות (אופציונלי)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createTransfer.isPending} className="w-full">
                {createTransfer.isPending ? "מעבד..." : "בצע העברה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">ממחסן</TableHead>
              <TableHead className="text-right">למחסן</TableHead>
              <TableHead className="text-right">פריטים</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">הערות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !transfers?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">אין העברות</TableCell></TableRow>
            ) : (
              transfers.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("he-IL")}</TableCell>
                  <TableCell>{t.from_warehouse?.name || "—"}</TableCell>
                  <TableCell>{t.to_warehouse?.name || "—"}</TableCell>
                  <TableCell>
                    {t.inventory_transfer_items?.map((item: any) => (
                      <div key={item.id} className="text-xs">
                        {item.product_variations?.products?.name} — {item.product_variations?.name} × {item.quantity}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === "completed" ? "default" : "secondary"}>
                      {t.status === "completed" ? "הושלם" : "ממתין"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.notes || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransfersPage;

import { useState } from "react";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { toast } from "sonner";

interface IntakeItem {
  variation_id: string;
  variation_name: string;
  product_name: string;
  quantity: number;
}

const IntakePage = () => {
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<IntakeItem[]>([]);
  const [selectedVariation, setSelectedVariation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: warehouses } = useWarehouses();
  const qc = useQueryClient();

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

  const updateQuantity = (idx: number, q: number) => {
    if (q < 1) return;
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: q } : item));
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!warehouseId) { toast.error("בחר מחסן"); return; }
    if (items.length === 0) { toast.error("הוסף פריטים"); return; }

    setSubmitting(true);
    try {
      for (const item of items) {
        // Get current inventory
        const { data: existing } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("variation_id", item.variation_id)
          .eq("warehouse_id", warehouseId)
          .maybeSingle();

        const currentQty = existing?.quantity || 0;
        const newQty = currentQty + item.quantity;

        if (existing) {
          await supabase.from("inventory").update({ quantity: newQty }).eq("id", existing.id);
        } else {
          await supabase.from("inventory").insert({
            variation_id: item.variation_id,
            warehouse_id: warehouseId,
            quantity: newQty,
          });
        }

        await logInventoryChange({
          variation_id: item.variation_id,
          warehouse_id: warehouseId,
          quantity_change: item.quantity,
          quantity_after: newQty,
          action_type: "intake",
          notes: `קליטת ${item.quantity} יחידות`,
        });
      }

      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      setItems([]);
      toast.success(`${items.length} פריטים נקלטו בהצלחה`);
    } catch {
      toast.error("שגיאה בקליטת מלאי");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-2">
        <PackagePlus className="h-6 w-6" />
        <h1 className="text-2xl font-bold">קליטת מלאי</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>בחירת מחסן</CardTitle></CardHeader>
        <CardContent>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="בחר מחסן..." /></SelectTrigger>
            <SelectContent>
              {warehouses?.filter((w) => w.is_active).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>פריטים לקליטה</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
                        onChange={(e) => updateQuantity(idx, Number(e.target.value))}
                        className="w-20 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button onClick={handleSubmit} disabled={submitting || items.length === 0 || !warehouseId} className="w-full" size="lg">
            {submitting ? "מעבד..." : `קלוט ${items.length} פריטים`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntakePage;

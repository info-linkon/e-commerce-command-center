import { useState, useMemo } from "react";
import { ArrowRight, Search, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventory } from "@/hooks/useInventory";
import { supabase } from "@/integrations/supabase/client";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { syncStockToWoo } from "@/lib/wooStockSync";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WriteOffLine {
  variation_id: string;
  warehouse_id: string;
  product_name: string;
  variation_name: string;
  current_qty: number;
  write_off_qty: number;
  inventory_id: string;
}

const InventoryWriteOffPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: warehouses } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState<string>("");
  const { data: inventoryData } = useInventory(warehouseId || undefined);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<WriteOffLine[]>([]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredInventory = useMemo(() => {
    if (!inventoryData || !warehouseId) return [];
    return inventoryData.filter((item) => {
      const variation = item.product_variations as any;
      const product = variation?.products;
      if (item.quantity <= 0) return false;
      if (lines.find((l) => l.variation_id === item.variation_id)) return false;
      if (!search) return true;
      return (
        variation?.name?.toLowerCase().includes(search.toLowerCase()) ||
        product?.name?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [inventoryData, warehouseId, search, lines]);

  const addLine = (item: any) => {
    const variation = item.product_variations as any;
    const product = variation?.products;
    setLines([...lines, {
      variation_id: item.variation_id,
      warehouse_id: item.warehouse_id,
      product_name: product?.name || "—",
      variation_name: variation?.name || "—",
      current_qty: item.quantity,
      write_off_qty: 1,
      inventory_id: item.id,
    }]);
  };

  const updateQty = (idx: number, qty: number) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, write_off_qty: Math.min(Math.max(1, qty), l.current_qty) } : l));
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      for (const line of lines) {
        const newQty = line.current_qty - line.write_off_qty;
        await supabase.from("inventory").update({ quantity: newQty }).eq("id", line.inventory_id);
        await logInventoryChange({
          variation_id: line.variation_id,
          warehouse_id: line.warehouse_id,
          quantity_change: -line.write_off_qty,
          quantity_after: newQty,
          action_type: "write_off" as any,
          notes: reason || "פחת מלאי",
        });
        syncStockToWoo(line.variation_id);
      }
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      toast.success(`${lines.length} פריטים הורדו מהמלאי`);
      setLines([]);
      setReason("");
    } catch {
      toast.error("שגיאה בהורדת מלאי");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventory")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הורדת מלאי (פחת)</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>בחירת פריטים</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="בחר מחסן..." /></SelectTrigger>
                  <SelectContent>
                    {warehouses?.filter((w) => w.is_active).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="חיפוש פריט..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" disabled={!warehouseId} />
                </div>
              </div>

              {warehouseId && filteredInventory.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-auto">
                  {filteredInventory.slice(0, 20).map((item) => {
                    const variation = item.product_variations as any;
                    const product = variation?.products;
                    return (
                      <button
                        key={item.id}
                        onClick={() => addLine(item)}
                        className="w-full text-right p-2 hover:bg-accent flex justify-between items-center border-b last:border-b-0"
                      >
                        <span className="text-sm">{product?.name} — {variation?.name}</span>
                        <span className="text-xs text-muted-foreground">כמות: {item.quantity}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {lines.length > 0 && (
            <Card>
              <CardHeader><CardTitle>פריטים להורדה</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">מוצר</TableHead>
                      <TableHead className="text-right">וריאציה</TableHead>
                      <TableHead className="text-right">כמות נוכחית</TableHead>
                      <TableHead className="text-right">כמות להורדה</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{line.product_name}</TableCell>
                        <TableCell>{line.variation_name}</TableCell>
                        <TableCell>{line.current_qty}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.write_off_qty}
                            min={1}
                            max={line.current_qty}
                            className="w-20 h-8"
                            onChange={(e) => updateQty(idx, Number(e.target.value))}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>סיבה</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="סיבת הפחת..."
                rows={3}
              />
            </CardContent>
          </Card>
          <Button
            className="w-full"
            variant="destructive"
            onClick={handleSubmit}
            disabled={lines.length === 0 || submitting}
          >
            {submitting ? "מעבד..." : `הורד ${lines.length} פריטים מהמלאי`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryWriteOffPage;

import { useState } from "react";
import { PackagePlus, Plus, Trash2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logInventoryChange } from "@/hooks/useInventoryLog";
import { toast } from "sonner";
import { syncMultipleStockToWoo } from "@/lib/wooStockSync";

interface IntakeItem {
  variation_id: string;
  variation_name: string;
  product_name: string;
  quantity: number;
  cost_price: number;
}

const IntakePage = () => {
  const [step, setStep] = useState(1);
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
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
      cost_price: Number(v.cost_price) || 0,
    }]);
    setSelectedVariation("");
  };

  const updateItem = (idx: number, field: "quantity" | "cost_price", value: number) => {
    if (field === "quantity" && value < 1) return;
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.cost_price, 0);

  const handleSubmit = async () => {
    if (!warehouseId || items.length === 0) return;
    setSubmitting(true);
    try {
      // 1. Create intake session
      const { data: session, error: sessionErr } = await supabase
        .from("intake_sessions")
        .insert({
          warehouse_id: warehouseId,
          supplier_name: supplierName || null,
          reference_number: referenceNumber || null,
          notes: notes || null,
          total_items: items.length,
          status: "completed" as any,
        })
        .select()
        .single();
      if (sessionErr) throw sessionErr;

      // 2. Save session items
      await supabase.from("intake_session_items").insert(
        items.map((item) => ({
          session_id: session.id,
          variation_id: item.variation_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
        }))
      );

      // 3. Update inventory + log
      for (const item of items) {
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
          reference_id: session.id,
          notes: `קליטת ${item.quantity} יחידות${supplierName ? ` מספק: ${supplierName}` : ""}`,
        });
      }

      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_log"] });
      qc.invalidateQueries({ queryKey: ["intake_sessions"] });
      syncMultipleStockToWoo(items.map((i) => i.variation_id));

      toast.success(`${items.length} פריטים נקלטו בהצלחה`);
      // Reset
      setStep(1);
      setItems([]);
      setSupplierName("");
      setReferenceNumber("");
      setNotes("");
      setWarehouseId("");
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

      {/* Steps indicator */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={`text-sm ${step === s ? "font-medium" : "text-muted-foreground"}`}>
              {s === 1 ? "פרטי קליטה" : s === 2 ? "הוספת פריטים" : "סיכום ואישור"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Session details */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>פרטי קליטה</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>מחסן יעד *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="בחר מחסן..." /></SelectTrigger>
                <SelectContent>
                  {warehouses?.filter((w) => w.is_active).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שם ספק</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="אופציונלי" />
              </div>
              <div className="space-y-2">
                <Label>מספר אסמכתא / חשבונית</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="אופציונלי" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>הערות</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות לקליטה..." rows={3} />
            </div>
            <div className="flex justify-start">
              <Button onClick={() => setStep(2)} disabled={!warehouseId}>
                המשך לפריטים <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add items */}
      {step === 2 && (
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
                    <TableHead>מוצר</TableHead>
                    <TableHead>וריאציה</TableHead>
                    <TableHead>כמות</TableHead>
                    <TableHead>מחיר עלות ליח׳</TableHead>
                    <TableHead>סה״כ</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.variation_id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.variation_name}</TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          className="w-20 h-8" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} step={0.01} value={item.cost_price}
                          onChange={(e) => updateItem(idx, "cost_price", Number(e.target.value))}
                          className="w-24 h-8" />
                      </TableCell>
                      <TableCell className="font-medium">₪{(item.quantity * item.cost_price).toFixed(2)}</TableCell>
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowRight className="h-4 w-4 ml-1" /> חזור
              </Button>
              <Button onClick={() => setStep(3)} disabled={items.length === 0}>
                המשך לסיכום <ArrowLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>סיכום ואישור</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">מחסן</p>
                <p className="font-bold">{warehouses?.find((w) => w.id === warehouseId)?.name}</p>
              </div>
              {supplierName && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">ספק</p>
                  <p className="font-bold">{supplierName}</p>
                </div>
              )}
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">פריטים</p>
                <p className="font-bold">{items.length} סוגים / {totalUnits} יחידות</p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">סה״כ עלות</p>
                <p className="font-bold">₪{totalCost.toFixed(2)}</p>
              </div>
            </div>

            {referenceNumber && (
              <p className="text-sm text-muted-foreground">אסמכתא: {referenceNumber}</p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מוצר</TableHead>
                  <TableHead>וריאציה</TableHead>
                  <TableHead>כמות</TableHead>
                  <TableHead>עלות ליח׳</TableHead>
                  <TableHead>סה״כ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.variation_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{item.variation_name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₪{item.cost_price.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">₪{(item.quantity * item.cost_price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowRight className="h-4 w-4 ml-1" /> חזור
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} size="lg">
                {submitting ? "מעבד..." : `אשר קליטת ${totalUnits} יחידות`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntakePage;

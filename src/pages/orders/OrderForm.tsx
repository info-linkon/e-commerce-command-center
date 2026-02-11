import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateOrder } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface OrderLine {
  variation_id: string;
  variation_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const OrderForm = () => {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const { data: products } = useProducts();

  // Fetch all variations
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

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);

  const total = useMemo(() => lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0), [lines]);

  const addLine = (variationId: string) => {
    const v = variations?.find((x) => x.id === variationId);
    if (!v) return;
    const existing = lines.find((l) => l.variation_id === variationId);
    if (existing) {
      setLines(lines.map((l) => l.variation_id === variationId ? { ...l, quantity: l.quantity + 1 } : l));
      return;
    }
    setLines([...lines, {
      variation_id: v.id,
      variation_name: v.name,
      product_name: (v.products as any)?.name || "",
      quantity: 1,
      unit_price: Number(v.price),
    }]);
  };

  const updateLine = (idx: number, field: keyof OrderLine, value: number) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (lines.length === 0) return;
    await createOrder.mutateAsync({
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      customer_email: customerEmail || undefined,
      notes: notes || undefined,
      total,
      items: lines.map((l) => ({
        variation_id: l.variation_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.quantity * l.unit_price,
      })),
    });
    navigate("/orders");
  };

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">הזמנה חדשה</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי לקוח</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>שם לקוח</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} dir="ltr" className="text-right" />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} dir="ltr" className="text-right" />
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>סיכום</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">₪{total.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{lines.length} פריטים</div>
            <Button onClick={handleSubmit} disabled={lines.length === 0 || createOrder.isPending} className="w-full">
              {createOrder.isPending ? "שומר..." : "צור הזמנה"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>פריטים</CardTitle>
          <Select onValueChange={addLine}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="הוסף פריט..." />
            </SelectTrigger>
            <SelectContent>
              {variations?.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {(v.products as any)?.name} - {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מוצר</TableHead>
                <TableHead className="text-right">וריאציה</TableHead>
                <TableHead className="text-right">כמות</TableHead>
                <TableHead className="text-right">מחיר יחידה</TableHead>
                <TableHead className="text-right">סה״כ</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">הוסף פריטים להזמנה</TableCell></TableRow>
              ) : (
                lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{line.product_name}</TableCell>
                    <TableCell>{line.variation_name}</TableCell>
                    <TableCell>
                      <Input type="number" value={line.quantity} min={1} className="w-20 h-8" onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={line.unit_price} min={0} step={0.01} className="w-24 h-8" onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="font-medium">₪{(line.quantity * line.unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderForm;

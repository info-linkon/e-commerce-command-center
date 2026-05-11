import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateOrderStatus, type OrderStatus } from "@/hooks/useOrders";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { useCreateExpense } from "@/hooks/useExpenses";
import { useCreateDocument } from "@/hooks/useDocuments";

interface OrderItemForInvoice {
  details: string;
  amount: number;
  price: number;
  catalog_number?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderNumber: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderItems?: OrderItemForInvoice[];
  shippingCost?: number;
  discountAmount?: number;
  hasInvoice: boolean;
}

export default function CompleteOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  customerPhone,
  orderItems,
  shippingCost,
  discountAmount,
  hasInvoice,
}: Props) {
  const qc = useQueryClient();
  const { data: registers } = useCashRegisters();
  const updateStatus = useUpdateOrderStatus();
  const createExpense = useCreateExpense();
  const createDocument = useCreateDocument();

  const [actualShippingCost, setActualShippingCost] = useState<string>("0");
  const [shippingRegisterId, setShippingRegisterId] = useState<string>("");
  const [shippingNotes, setShippingNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const cost = Number(actualShippingCost) || 0;
  const activeRegisters = (registers || []).filter((r: any) => r.is_active !== false);
  const needsRegister = cost > 0;
  const canSubmit = !needsRegister || !!shippingRegisterId;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("יש לבחור קופה למשיכת הוצאת המשלוח");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Record shipping expense if cost > 0
      if (cost > 0 && shippingRegisterId) {
        await createExpense.mutateAsync({
          description: `משלוח להזמנה #${orderNumber}${shippingNotes ? ` — ${shippingNotes}` : ""}`,
          amount: cost,
          payment_source: "cash_register",
          cash_register_id: shippingRegisterId,
        });
      }

      // 2. Mark order completed
      await updateStatus.mutateAsync({ id: orderId, status: "completed" as OrderStatus });

      // 3. Trigger SMS for completion
      supabase.functions
        .invoke("order-sms-trigger", {
          body: { order_id: orderId, trigger_type: "order_completed" },
        })
        .catch(console.error);

      // 4. Auto-issue invoice/receipt (320) for the CASH/BIT portion only.
      //    Credit (HYP) payments already issued their own 320 at payment time.
      if (customerName) {
        try {
          const { data: pays } = await supabase
            .from("payments")
            .select("amount, payment_method")
            .eq("order_id", orderId);
          const cashPays = (pays || []).filter(
            (p: any) => p.payment_method === "cash" || p.payment_method === "bit"
          );
          const cashTotal = cashPays.reduce((s, p: any) => s + Number(p.amount), 0);
          const docPayments = cashPays.map((p: any) => ({
            type: p.payment_method === "cash" ? "cash" : "bit",
            amount: Number(p.amount),
          }));
          if (cashTotal > 0) {
            // Single summary line so items total == payments total (EZcount balance rule).
            // Avoids duplicating the line items already covered by the credit invoice.
            const summaryItems = [
              {
                details: `תשלום במסירה — הזמנה #${orderNumber}`,
                amount: 1,
                price: cashTotal,
              },
            ];
            const result = await createDocument.mutateAsync({
              doc_type: "invoice_receipt",
              order_id: orderId,
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              items: summaryItems,
              payments: docPayments,
            });
            const shortCode = result?.short_code;
            const invoiceLink = shortCode
              ? `https://elwejha.co.il/inv/${shortCode}`
              : result?.doc_url;
            if (invoiceLink) {
              await supabase
                .from("orders")
                .update({ invoice_url: invoiceLink } as any)
                .eq("id", orderId);

              // Send invoice link by SMS
              if (customerPhone) {
                supabase.functions
                  .invoke("order-sms-trigger", {
                    body: {
                      order_id: orderId,
                      trigger_type: "invoice_issued",
                    },
                  })
                  .catch(console.error);
              }
            }
            toast.success("חשבונית מס/קבלה לחלק המזומן הונפקה ונשלחה ללקוח");
          }
        } catch (err: any) {
          console.error("Auto invoice error:", err);
          toast.warning(`ההזמנה הושלמה אך ההנפקה האוטומטית נכשלה: ${err?.message || "שגיאה"}`);
        }
      }

      qc.invalidateQueries({ queryKey: ["orders", orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["cash_registers"] });
      onOpenChange(false);
      // reset
      setActualShippingCost("0");
      setShippingRegisterId("");
      setShippingNotes("");
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בהשלמת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>השלמת הזמנה #{orderNumber}</DialogTitle>
          <DialogDescription>
            הזן את עלות המשלוח בפועל. תרשם הוצאה אוטומטית, וחשבונית מס/קבלה תונפק ותישלח ללקוח.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="shipping-cost">עלות משלוח בפועל (₪)</Label>
            <Input
              id="shipping-cost"
              type="number"
              min="0"
              step="0.01"
              value={actualShippingCost}
              onChange={(e) => setActualShippingCost(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              אם המשלוח לא עלה לכם — השאר 0. אחרת תרשם הוצאה.
            </p>
          </div>

          {needsRegister && (
            <>
              <div className="space-y-2">
                <Label htmlFor="shipping-register">קופה לחיוב ההוצאה</Label>
                <Select value={shippingRegisterId} onValueChange={setShippingRegisterId}>
                  <SelectTrigger id="shipping-register">
                    <SelectValue placeholder="בחר קופה" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRegisters.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} (יתרה: ₪{Number(r.current_balance).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping-notes">הערות (אופציונלי)</Label>
                <Input
                  id="shipping-notes"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="ספק משלוח, מספר משלוח..."
                />
              </div>
            </>
          )}

          {hasInvoice && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
              קיימת חשבונית קיימת להזמנה — לא תונפק חשבונית נוספת.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                משלים...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                סמן כהושלמה
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
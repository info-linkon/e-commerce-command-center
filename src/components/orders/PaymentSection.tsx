import { useState } from "react";
import { CreditCard, Plus, Trash2, CheckCircle2, Banknote, Smartphone, FileText, ExternalLink, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useOrderPayments, useRecordPayment } from "@/hooks/usePayments";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { useCreateDocument } from "@/hooks/useDocuments";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

const methodLabels: Record<PaymentMethod, string> = { cash: "מזומן", bit: "ביט", credit: "אשראי" };
const methodIcons: Record<PaymentMethod, any> = { cash: Banknote, bit: Smartphone, credit: CreditCard };

interface PaymentLine {
  amount: string;
  method: PaymentMethod;
  cash_register_id: string;
  reference: string;
}

interface OrderItemForInvoice {
  details: string;
  amount: number;
  price: number;
  catalog_number?: string;
}

interface PaymentSectionProps {
  orderId: string;
  orderTotal: number;
  orderNumber?: number;
  isDelivered: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderItems?: OrderItemForInvoice[];
  invoiceUrl?: string | null;
}

const PaymentSection = ({
  orderId, orderTotal, orderNumber, isDelivered, isCancelled, isCompleted,
  customerName, customerEmail, customerPhone, orderItems, invoiceUrl,
}: PaymentSectionProps) => {
  const { data: existingPayments } = useOrderPayments(orderId);
  const { data: registers } = useCashRegisters();
  const recordPayment = useRecordPayment();
  const createDocument = useCreateDocument();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [completeOrder, setCompleteOrder] = useState(true);
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);
  const [lines, setLines] = useState<PaymentLine[]>([
    { amount: String(orderTotal), method: "cash", cash_register_id: "", reference: "" },
  ]);

  // Check if invoice receipt (type 320) already exists for this order
  const { data: existingInvoiceDocs } = useQuery({
    queryKey: ["documents", orderId, "invoice_receipt"],
    enabled: !!orderId,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents" as any)
        .select("id, doc_url")
        .eq("order_id", orderId)
        .eq("doc_type", 320)
        .eq("status", "issued");
      return data as any[] | null;
    },
  });
  const hasInvoiceReceipt = (existingInvoiceDocs && existingInvoiceDocs.length > 0) || !!invoiceUrl;

  const totalPaid = existingPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const remaining = orderTotal - totalPaid;

  const hasCashLine = lines.some((l) => l.method === "cash" && parseFloat(l.amount) > 0);

  const resetForm = () => {
    setLines([{ amount: String(remaining > 0 ? remaining : orderTotal), method: "cash", cash_register_id: "", reference: "" }]);
    setCompleteOrder(true);
    setIssueInvoice(false);
  };

  const updateLine = (idx: number, field: keyof PaymentLine, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const addLine = () => {
    const currentSum = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const leftover = Math.max(0, remaining - currentSum);
    setLines((prev) => [...prev, { amount: String(leftover), method: "cash", cash_register_id: "", reference: "" }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const linesTotal = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const handleSubmit = () => {
    const payments = lines
      .filter((l) => parseFloat(l.amount) > 0)
      .map((l) => ({
        amount: parseFloat(l.amount),
        payment_method: l.method,
        cash_register_id: l.method === "cash" ? l.cash_register_id || null : null,
        reference: l.reference || undefined,
      }));
    if (payments.length === 0) return;

    recordPayment.mutate(
      { order_id: orderId, payments, completeOrder },
      {
        onSuccess: async () => {
          // Issue invoice if toggled on
          if (issueInvoice && customerName && orderItems && orderItems.length > 0) {
            try {
              const docPayments = payments.map((p) => ({
                type: p.payment_method === "cash" ? "cash" : p.payment_method === "bit" ? "bit" : "credit",
                amount: p.amount,
              }));

              const result = await createDocument.mutateAsync({
                doc_type: "invoice_receipt",
                order_id: orderId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                items: orderItems,
                payments: docPayments,
              });

              // Save short invoice URL to order
              const shortCode = result?.short_code;
              const invoiceLink = shortCode
                ? `/inv/${shortCode}`
                : result?.doc_url;
              if (invoiceLink) {
                await supabase
                  .from("orders")
                  .update({ invoice_url: invoiceLink } as any)
                  .eq("id", orderId);
                qc.invalidateQueries({ queryKey: ["orders", orderId] });
              }
            } catch (err) {
              console.error("Invoice creation error:", err);
            }
          }
          setOpen(false);
        },
      }
    );
  };

  // Show existing payments
  const hasPayments = existingPayments && existingPayments.length > 0;

  // Determine displayed invoice URL
  const displayInvoiceUrl = invoiceUrl || (existingInvoiceDocs?.[0] as any)?.doc_url;

  return (
    <Card className={isCompleted ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            תשלום
          </div>
          <div className="flex items-center gap-2">
            {displayInvoiceUrl && (
              <a href={displayInvoiceUrl} target="_blank" rel="noopener noreferrer">
                <Badge className="bg-blue-100 text-blue-800 border-0 gap-1 cursor-pointer hover:bg-blue-200">
                  <FileText className="h-3 w-3" />
                  חשבונית מס קבלה
                  <ExternalLink className="h-3 w-3" />
                </Badge>
              </a>
            )}
            {isCompleted && (
              <Badge className="bg-green-100 text-green-800 border-0">שולם</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing payments */}
        {hasPayments && (
          <div className="space-y-2">
            {existingPayments.map((p: any) => {
              const Icon = methodIcons[p.payment_method as PaymentMethod] || CreditCard;
              return (
                <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{methodLabels[p.payment_method as PaymentMethod]}</span>
                    {p.cash_registers?.name && (
                      <span className="text-muted-foreground">({p.cash_registers.name})</span>
                    )}
                    {p.reference && <span className="text-muted-foreground">• {p.reference}</span>}
                  </div>
                  <span className="font-medium">₪{Number(p.amount).toFixed(2)}</span>
                </div>
              );
            })}
            <div className="flex justify-between text-sm pt-1 border-t">
              <span className="text-muted-foreground">שולם</span>
              <span className="font-bold">₪{totalPaid.toFixed(2)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-destructive">נותר</span>
                <span className="font-bold text-destructive">₪{remaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Payment button — show if not cancelled and there's remaining balance */}
        {!isCancelled && !isCompleted && remaining > 0 && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="w-full gap-2"
                disabled={!isDelivered && !hasPayments}
              >
                <CreditCard className="h-4 w-4" />
                {hasPayments ? "הוסף תשלום" : "רשום תשלום"}
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-md">
              <DialogHeader>
                <DialogTitle>רישום תשלום — ₪{remaining.toFixed(2)} נותר</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">תשלום {idx + 1}</span>
                      {lines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(idx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">סכום</Label>
                        <Input
                          type="number"
                          value={line.amount}
                          onChange={(e) => updateLine(idx, "amount", e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">אמצעי</Label>
                        <Select value={line.method} onValueChange={(v) => updateLine(idx, "method", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">מזומן</SelectItem>
                            <SelectItem value="bit">ביט</SelectItem>
                            <SelectItem value="credit">אשראי</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {line.method === "cash" && (
                      <div>
                        <Label className="text-xs">קופה</Label>
                        <Select value={line.cash_register_id} onValueChange={(v) => updateLine(idx, "cash_register_id", v)}>
                          <SelectTrigger><SelectValue placeholder="בחר קופה..." /></SelectTrigger>
                          <SelectContent>
                            {registers?.filter((r) => r.is_active).map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {line.method !== "cash" && (
                      <div>
                        <Label className="text-xs">אסמכתא</Label>
                        <Input
                          value={line.reference}
                          onChange={(e) => updateLine(idx, "reference", e.target.value)}
                          placeholder="מספר אסמכתא (אופציונלי)"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <Button variant="outline" size="sm" onClick={addLine} className="w-full gap-1">
                  <Plus className="h-3 w-3" /> פיצול תשלום
                </Button>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span>סה״כ תשלום</span>
                  <span className={`font-bold ${Math.abs(linesTotal - remaining) > 0.01 ? "text-destructive" : ""}`}>
                    ₪{linesTotal.toFixed(2)}
                  </span>
                </div>

                {/* Invoice toggle — show only if cash payment and no existing invoice */}
                {hasCashLine && !hasInvoiceReceipt && customerName && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                    <Switch checked={issueInvoice} onCheckedChange={setIssueInvoice} />
                    <Label className="text-sm flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      הנפק חשבונית מס קבלה
                    </Label>
                  </div>
                )}

                {Math.abs(linesTotal - remaining) < 0.01 && (
                  <div className="flex items-center gap-2">
                    <Switch checked={completeOrder} onCheckedChange={setCompleteOrder} />
                    <Label className="text-sm">סמן הזמנה כהושלמה</Label>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={linesTotal <= 0 || recordPayment.isPending || createDocument.isPending}
                  className="w-full gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {recordPayment.isPending || createDocument.isPending ? "שומר..." : "אשר תשלום"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {!isCancelled && !isCompleted && !isDelivered && !hasPayments && remaining > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            תשלום יהיה זמין לאחר שהמשלוח יסומן כנמסר
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSection;

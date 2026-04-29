import { useState } from "react";
import { useDocuments, useCreateDocument, DOC_TYPE_LABELS, CreateDocInput } from "@/hooks/useDocuments";
import { useUserNames } from "@/hooks/useUserNames";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const DOC_TYPES = [
  { value: "tax_invoice", label: "חשבונית מס" },
  { value: "invoice_receipt", label: "חשבונית מס / קבלה" },
  { value: "receipt", label: "קבלה" },
  { value: "delivery_note", label: "תעודת משלוח" },
];

const PAYMENT_TYPES = [
  { value: "cash", label: "מזומן" },
  { value: "credit", label: "אשראי" },
  { value: "bit", label: "ביט" },
  { value: "bank_transfer", label: "העברה בנקאית" },
];

interface ItemRow {
  details: string;
  amount: number;
  price: number;
  catalog_number: string;
}

interface PaymentRow {
  type: string;
  amount: number;
}

export default function DocumentsPage({ embedded = false }: { embedded?: boolean }) {
  const { data: documents, isLoading } = useDocuments();
  const createDoc = useCreateDocument();
  const { nameOf } = useUserNames();
  const [open, setOpen] = useState(false);

  const [docType, setDocType] = useState<CreateDocInput["doc_type"]>("tax_invoice");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [dontSendEmail, setDontSendEmail] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([{ details: "", amount: 1, price: 0, catalog_number: "" }]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const needsPayments = docType === "receipt" || docType === "invoice_receipt";
  const itemsTotal = items.reduce((s, i) => s + i.amount * i.price, 0);

  const resetForm = () => {
    setDocType("tax_invoice");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setDescription("");
    setComment("");
    setDontSendEmail(false);
    setItems([{ details: "", amount: 1, price: 0, catalog_number: "" }]);
    setPayments([]);
  };

  const addItem = () => setItems([...items, { details: "", amount: 1, price: 0, catalog_number: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemRow, value: string | number) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  const addPayment = () => setPayments([...payments, { type: "cash", amount: itemsTotal }]);
  const removePayment = (i: number) => setPayments(payments.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!customerName || items.length === 0 || !items[0].details) return;

    const input: CreateDocInput = {
      doc_type: docType,
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      items: items.filter((i) => i.details),
      description: description || undefined,
      comment: comment || undefined,
      dont_send_email: dontSendEmail,
    };

    if (needsPayments && payments.length > 0) {
      input.payments = payments;
    }

    await createDoc.mutateAsync(input);
    setOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        {!embedded && <h1 className="text-2xl font-bold">מסמכים</h1>}
        {embedded && <div />}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              הפקת מסמך
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>הפקת מסמך חדש</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>סוג מסמך</Label>
                <Select value={docType} onValueChange={(v) => setDocType(v as CreateDocInput["doc_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>שם לקוח *</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>פריטים</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 ml-1" /> פריט
                  </Button>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input placeholder="תיאור" value={item.details} onChange={(e) => updateItem(i, "details", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input placeholder="מק״ט" value={item.catalog_number} onChange={(e) => updateItem(i, "catalog_number", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="כמות" value={item.amount} onChange={(e) => updateItem(i, "amount", +e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="מחיר" value={item.price} onChange={(e) => updateItem(i, "price", +e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-right font-medium">סה״כ: ₪{itemsTotal.toFixed(2)}</div>
              </div>

              {needsPayments && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>תשלומים</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                      <Plus className="h-3 w-3 ml-1" /> תשלום
                    </Button>
                  </div>
                  {payments.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select value={p.type} onValueChange={(v) => setPayments(payments.map((pp, idx) => idx === i ? { ...pp, type: v } : pp))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5">
                        <Input type="number" placeholder="סכום" value={p.amount} onChange={(e) => setPayments(payments.map((pp, idx) => idx === i ? { ...pp, amount: +e.target.value } : pp))} />
                      </div>
                      <div className="col-span-2">
                        <Button variant="ghost" size="icon" onClick={() => removePayment(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תיאור</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>הערה</Label>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="dontSendEmail" checked={dontSendEmail} onChange={(e) => setDontSendEmail(e.target.checked)} />
                <Label htmlFor="dontSendEmail">אל תשלח מייל ללקוח</Label>
              </div>

              <Button onClick={handleSubmit} disabled={createDoc.isPending || !customerName} className="w-full">
                {createDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <FileText className="h-4 w-4 ml-2" />}
                הפק מסמך
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>מסמכים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !documents?.length ? (
            <p className="text-center text-muted-foreground py-8">אין מסמכים עדיין</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מספר</TableHead>
                  <TableHead>סוג</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell>{doc.doc_number || "-"}</TableCell>
                    <TableCell>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</TableCell>
                    <TableCell>{doc.customer_name}</TableCell>
                    <TableCell>₪{Number(doc.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={doc.status === "issued" ? "default" : doc.status === "error" ? "destructive" : "secondary"}>
                        {doc.status === "issued" ? "הופק" : doc.status === "error" ? "שגיאה" : "טיוטה"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>
                      {doc.doc_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.doc_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useRef } from "react";
import { Receipt, Plus, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useExpenses, useCreateExpense } from "@/hooks/useExpenses";
import { useCashRegisters } from "@/hooks/useCashRegisters";

const sourceLabels: Record<string, string> = {
  cash_register: "קופה",
  credit_card: "אשראי",
};

const ExpensesPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { data: expenses, isLoading } = useExpenses();
  const { data: registers } = useCashRegisters();
  const createExpense = useCreateExpense();

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<string>("credit_card");
  const [registerId, setRegisterId] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!description.trim() || !amount) return;
    createExpense.mutate(
      {
        description: description.trim(),
        amount: parseFloat(amount),
        payment_source: source as any,
        cash_register_id: source === "cash_register" ? registerId || null : null,
        document_file: docFile || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setDescription("");
          setAmount("");
          setSource("credit_card");
          setRegisterId("");
          setDocFile(null);
        },
      }
    );
  };

  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {!embedded && (
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              הוצאות
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            סה״כ: ₪{totalExpenses.toFixed(2)}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />הוצאה חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>רישום הוצאה</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>תיאור</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור ההוצאה" rows={2} />
              </div>
              <div>
                <Label>סכום</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
              </div>
              <div>
                <Label>מקור תשלום</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">אשראי</SelectItem>
                    <SelectItem value="cash_register">קופה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {source === "cash_register" && (
                <div>
                  <Label>קופה</Label>
                  <Select value={registerId} onValueChange={setRegisterId}>
                    <SelectTrigger><SelectValue placeholder="בחר קופה..." /></SelectTrigger>
                    <SelectContent>
                      {registers?.filter((r) => r.is_active).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} (₪{Number(r.current_balance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>מסמך (אופציונלי)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
                {docFile ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{docFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDocFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    העלה מסמך
                  </Button>
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!description.trim() || !amount || createExpense.isPending || (source === "cash_register" && !registerId)}
                className="w-full"
              >
                {createExpense.isPending ? "שומר..." : "רשום הוצאה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">טוען...</div>
          ) : !expenses?.length ? (
            <div className="py-12 text-center text-muted-foreground">אין הוצאות</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תיאור</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>מקור</TableHead>
                  <TableHead>תאריך</TableHead>
                  <TableHead>מסמך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.description}</TableCell>
                    <TableCell className="font-medium">₪{Number(e.amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sourceLabels[e.payment_source] || e.payment_source}
                        {e.cash_registers?.name && ` — ${e.cash_registers.name}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.created_at).toLocaleString("he-IL")}
                    </TableCell>
                    <TableCell>
                      {(e.document_file || e.document_url) ? (
                        <a href={e.document_file || e.document_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                          צפה
                        </a>
                      ) : "—"}
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
};

export default ExpensesPage;

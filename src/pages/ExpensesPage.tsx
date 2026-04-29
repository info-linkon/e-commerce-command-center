import { useState, useRef, useEffect } from "react";
import { Receipt, Plus, Upload, FileText, X, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { useUserNames } from "@/hooks/useUserNames";
import { useCashRegisters } from "@/hooks/useCashRegisters";

const sourceLabels: Record<string, string> = {
  cash_register: "קופה",
  credit_card: "אשראי",
};

const ExpensesPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { data: expenses, isLoading } = useExpenses();
  const { data: registers } = useCashRegisters();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { nameOf } = useUserNames();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<string>("credit_card");
  const [registerId, setRegisterId] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null);
  const [removeExistingDoc, setRemoveExistingDoc] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setSource("credit_card");
    setRegisterId("");
    setDocFile(null);
    setExistingDocUrl(null);
    setRemoveExistingDoc(false);
    setDate(new Date());
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setDescription(e.description);
    setAmount(String(e.amount));
    setSource(e.payment_source);
    setRegisterId(e.cash_register_id || "");
    setDocFile(null);
    setExistingDocUrl(e.document_file || e.document_url || null);
    setRemoveExistingDoc(false);
    setDate(new Date(e.created_at));
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!description.trim() || !amount) return;
    const payload = {
      description: description.trim(),
      amount: parseFloat(amount),
      payment_source: source as any,
      cash_register_id: source === "cash_register" ? registerId || null : null,
      created_at: date.toISOString(),
    };

    if (editingId) {
      updateExpense.mutate(
        {
          id: editingId,
          ...payload,
          document_file: docFile,
          remove_document: removeExistingDoc && !docFile,
        },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      createExpense.mutate(
        { ...payload, document_file: docFile || undefined },
        { onSuccess: () => setOpen(false) }
      );
    }
  };

  const totalExpenses = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
  const pending = createExpense.isPending || updateExpense.isPending;

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
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת הוצאה" : "רישום הוצאה"}</DialogTitle>
            </DialogHeader>
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
                <Label>תאריך</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy") : "בחר תאריך"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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
                  onChange={(e) => {
                    setDocFile(e.target.files?.[0] || null);
                    setRemoveExistingDoc(false);
                  }}
                />
                {docFile ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{docFile.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDocFile(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : existingDocUrl && !removeExistingDoc ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a href={existingDocUrl} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 text-primary underline">
                      מסמך קיים
                    </a>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRemoveExistingDoc(true)}>
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
                onClick={handleSubmit}
                disabled={!description.trim() || !amount || pending || (source === "cash_register" && !registerId)}
                className="w-full"
              >
                {pending ? "שומר..." : editingId ? "עדכן הוצאה" : "רשום הוצאה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">טוען...</div>
        ) : !expenses?.length ? (
          <div className="py-12 text-center text-muted-foreground">אין הוצאות</div>
        ) : (
          expenses.map((e: any) => (
            <Card key={e.id} className="p-3">
              <div className="flex justify-between items-start gap-2">
                <Badge variant="outline" className="text-xs">
                  {sourceLabels[e.payment_source] || e.payment_source}
                </Badge>
                <span className="font-medium flex-1 text-right">{e.description}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground text-xs">{new Date(e.created_at).toLocaleDateString("he-IL")}</span>
                <span className="font-bold">₪{Number(e.amount).toFixed(2)}</span>
              </div>
              <div className="flex gap-1 mt-2 pt-2 border-t">
                <Button size="sm" variant="ghost" className="flex-1 gap-1" onClick={() => startEdit(e)}>
                  <Pencil className="h-3 w-3" /> עריכה
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 gap-1 text-destructive" onClick={() => setDeleteId(e.id)}>
                  <Trash2 className="h-3 w-3" /> מחיקה
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
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
                  <TableHead className="w-[120px]">פעולות</TableHead>
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הוצאה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את ההוצאה? פעולה זו תחזיר את הסכום לקופה (אם שולם מקופה).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteExpense.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
                }
              }}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;

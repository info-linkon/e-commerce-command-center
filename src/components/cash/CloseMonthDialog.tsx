import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck } from "lucide-react";
import {
  useCashClosings,
  useRegisterPeriodSummary,
  useCloseCashPeriod,
  lastClosed,
  toISODate,
} from "@/hooks/useCashClosings";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end), label: `${MONTHS_HE[month]} ${year}` };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  register: { id: string; name: string; current_balance: number } | null;
};

const CloseMonthDialog = ({ open, onOpenChange, register }: Props) => {
  const { data: closings } = useCashClosings(register?.id ?? null);
  const closePeriod = useCloseCashPeriod();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  // Default: the month right after the last closed one, otherwise last month.
  const baseMonth = useMemo(() => {
    const now = new Date();
    if (!register) return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = lastClosed(closings, register.id);
    if (last) {
      const d = new Date(`${last.period_end}T00:00:00`);
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, [closings, register]);

  const period = useMemo(() => {
    const d = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + monthOffset, 1);
    return monthRange(d.getFullYear(), d.getMonth());
  }, [baseMonth, monthOffset]);

  const { data: summary, isLoading } = useRegisterPeriodSummary(
    open && register ? register.id : null,
    period.start,
    period.end,
  );

  useEffect(() => {
    if (open) {
      setCounted("");
      setNotes("");
      setMonthOffset(0);
    }
  }, [open, register?.id]);

  const countedNum = parseFloat(counted);
  const hasCounted = isFinite(countedNum);
  const expectedBalance = Number(summary?.expected ?? 0);
  const diff = hasCounted ? countedNum - expectedBalance : 0;

  const handleClose = () => {
    if (!register || !summary || !hasCounted) return;
    closePeriod.mutate(
      {
        register_id: register.id,
        period_start: period.start,
        period_end: period.end,
        expected: currentBalance,
        counted: countedNum,
        notes: notes.trim() || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const row = (label: string, value: string, cls = "") => (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${cls}`}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            סגירת חודש — {register?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset((v) => v - 1)}>
              ‹ קודם
            </Button>
            <span className="font-semibold">{period.label}</span>
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset((v) => v + 1)}>
              הבא ›
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            {isLoading || !summary ? (
              <div className="text-center text-muted-foreground py-2">טוען...</div>
            ) : (
              <>
                {row("יתרת פתיחה", `₪${summary.opening.toFixed(2)}`)}
                {row("+ תשלומים", `+₪${summary.payments.toFixed(2)}`, "text-green-700")}
                {row("− הוצאות", `−₪${summary.expenses.toFixed(2)}`, "text-red-700")}
                {row("+ העברות נכנסות", `+₪${summary.transfersIn.toFixed(2)}`, "text-green-700")}
                {row("− העברות יוצאות", `−₪${summary.transfersOut.toFixed(2)}`, "text-red-700")}
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="text-muted-foreground">= יתרה צפויה</span>
                  <span className="font-bold">₪{currentBalance.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="counted">סכום שנספר בפועל בקופה</Label>
            <Input
              id="counted"
              type="number"
              step="0.01"
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {hasCounted && summary && (
            <div
              className={`rounded-md border px-3 py-2 text-sm flex justify-between ${
                Math.abs(diff) < 0.01
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span>{Math.abs(diff) < 0.01 ? "אין פער — הסכום תואם" : diff > 0 ? "עודף" : "חוסר"}</span>
              <span className="font-bold">
                {Math.abs(diff) < 0.01 ? "₪0.00" : `${diff > 0 ? "+" : "−"}₪${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="closing-notes">הערות</Label>
            <Textarea
              id="closing-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הסבר על הפער, אם יש"
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            לאחר האישור התקופה תינעל: לא ניתן להוסיף או לשנות תשלומים, הוצאות והעברות בתאריכים אלה.
            היתרה בקופה תתעדכן לסכום שנספר.
          </p>

          <Button
            onClick={handleClose}
            disabled={!hasCounted || !summary || closePeriod.isPending}
            className="w-full"
          >
            {closePeriod.isPending ? "סוגר..." : "אשר וסגור את החודש"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloseMonthDialog;

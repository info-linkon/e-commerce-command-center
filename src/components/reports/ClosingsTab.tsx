import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck } from "lucide-react";
import { useCashClosings } from "@/hooks/useCashClosings";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { useUserNames } from "@/hooks/useUserNames";

const fmt = (n: number) => `₪${Number(n).toFixed(2)}`;
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("he-IL");

const ClosingsTab = ({ startDate, endDate }: { startDate: string; endDate?: string }) => {
  const { data: closings, isLoading } = useCashClosings();
  const { data: registers } = useCashRegisters();
  const { nameOf } = useUserNames();

  const from = startDate.slice(0, 10);
  const to = (endDate || new Date().toISOString()).slice(0, 10);
  const rows = (closings || []).filter((c) => c.period_end >= from && c.period_start <= to);

  const registerName = (id: string) => registers?.find((r) => r.id === id)?.name || "קופה";

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="h-5 w-5" />
          סגירות חודש
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">טוען...</div>
        ) : !rows.length ? (
          <div className="py-8 text-center text-muted-foreground">אין סגירות חודש בתקופה זו</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">קופה</TableHead>
                  <TableHead className="text-right">תקופה</TableHead>
                  <TableHead className="text-right">צפוי</TableHead>
                  <TableHead className="text-right">נספר</TableHead>
                  <TableHead className="text-right">פער</TableHead>
                  <TableHead className="text-right">נסגר על ידי</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">הערות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const diff = Number(c.difference);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{registerName(c.cash_register_id)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmtDate(c.period_start)} — {fmtDate(c.period_end)}
                      </TableCell>
                      <TableCell>{fmt(c.expected_balance)}</TableCell>
                      <TableCell className="font-semibold">{fmt(c.counted_balance)}</TableCell>
                      <TableCell
                        className={Math.abs(diff) < 0.01 ? "" : diff > 0 ? "text-green-700" : "text-red-700"}
                      >
                        {Math.abs(diff) < 0.01 ? "—" : `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`}
                      </TableCell>
                      <TableCell>{c.closed_by ? nameOf(c.closed_by) : "—"}</TableCell>
                      <TableCell>
                        {c.is_open ? (
                          <Badge variant="outline">נפתח מחדש</Badge>
                        ) : (
                          <Badge variant="secondary">נעול</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {c.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClosingsTab;

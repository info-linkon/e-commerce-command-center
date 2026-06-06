import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StatsCardsProps {
  startDate: string;
  endDate: string;
}

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  processing: "בטיפול",
  completed: "הושלם",
  cancelled: "בוטל",
  on_hold: "מושהה",
  refunded: "הוחזר",
  failed: "נכשל",
};

const methodLabels: Record<string, string> = {
  cash: "מזומן",
  credit: "אשראי",
  bit: "ביט",
  bank_transfer: "העברה בנקאית",
};

const StatsCards = ({ startDate, endDate }: StatsCardsProps) => {
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["dashboard-stats", startDate, endDate],
    queryFn: async () => {
      const [salesOrders, payments] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .not("status", "in", "(cancelled,unfulfilled)"),
        supabase
          .from("payments")
          .select(
            "amount, payment_method, reference, order_id, created_at, orders!inner(order_number, customer_name, status, created_at)",
          )
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

      const salesTotal = (salesOrders.data || []).reduce(
        (s, o) => s + Number(o.total),
        0,
      );
      const ordersCount = salesOrders.data?.length || 0;

      const paymentsList = payments.data || [];
      const includedPayments = paymentsList.filter((p: any) => {
        if (p.orders?.status === "cancelled" || p.orders?.status === "unfulfilled") return false;
        if (p.payment_method === "cash" && p.orders?.status !== "completed")
          return false;
        return ["cash", "credit", "bit"].includes(p.payment_method);
      });

      const cashTotal = includedPayments
        .filter((p: any) => p.payment_method === "cash")
        .reduce((s, p) => s + Number(p.amount), 0);
      const creditTotal = includedPayments
        .filter((p: any) => p.payment_method === "credit")
        .reduce((s, p) => s + Number(p.amount), 0);
      const bitTotal = includedPayments
        .filter((p: any) => p.payment_method === "bit")
        .reduce((s, p) => s + Number(p.amount), 0);
      const totalIncome = cashTotal + creditTotal + bitTotal;

      return {
        salesTotal,
        ordersCount,
        cashTotal,
        creditTotal,
        bitTotal,
        totalIncome,
        incomePayments: includedPayments,
      };
    },
    refetchInterval: 30000,
  });

  const incomePayments = data?.incomePayments || [];

  const exportCsv = () => {
    const headers = ["מס׳ הזמנה", "לקוח", "סטטוס", "אופי תשלום", "סכום", "תאריך"];
    const rows = incomePayments.map((p: any) => [
      p.orders?.order_number ?? "",
      p.orders?.customer_name ?? "",
      statusLabels[p.orders?.status] || p.orders?.status || "",
      methodLabels[p.payment_method] || p.payment_method,
      Number(p.amount).toFixed(2),
      new Date(p.created_at).toLocaleString("he-IL"),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">מכירות</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₪{(data?.salesTotal || 0).toFixed(0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.ordersCount || 0} הזמנות
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">כסף נכנס</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-2xl font-bold">
                ₪{(data?.totalIncome || 0).toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">
                מזומן ₪{(data?.cashTotal || 0).toFixed(0)} | אשראי ₪
                {(data?.creditTotal || 0).toFixed(0)} | ביט ₪
                {(data?.bitTotal || 0).toFixed(0)}
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-4 w-4" />
                  דוח
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
                <DialogHeader>
                  <DialogTitle>דוח כסף נכנס — {incomePayments.length} תשלומים</DialogTitle>
                </DialogHeader>
                <div className="flex justify-end mb-2">
                  <Button size="sm" onClick={exportCsv} disabled={!incomePayments.length}>
                    ייצוא ל-CSV
                  </Button>
                </div>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>מס׳ הזמנה</TableHead>
                        <TableHead>לקוח</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>אופי תשלום</TableHead>
                        <TableHead>סכום</TableHead>
                        <TableHead>תאריך</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {incomePayments.map((p: any) => (
                        <TableRow key={p.order_id + p.created_at + p.amount}>
                          <TableCell>#{p.orders?.order_number}</TableCell>
                          <TableCell>{p.orders?.customer_name}</TableCell>
                          <TableCell>
                            {statusLabels[p.orders?.status] || p.orders?.status}
                          </TableCell>
                          <TableCell>
                            {methodLabels[p.payment_method] || p.payment_method}
                          </TableCell>
                          <TableCell>₪{Number(p.amount).toFixed(0)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("he-IL")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!incomePayments.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            אין נתונים בטווח הנבחר
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;

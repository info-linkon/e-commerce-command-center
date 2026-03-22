import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { Link } from "react-router-dom";
import { ExternalLink, Wallet } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#e2a308", "#22c55e", "#ef4444", "#8b5cf6"];
const methodLabels: Record<string, string> = { cash: "מזומן", bit: "ביט", credit: "אשראי" };

interface Props {
  startDate: string;
}

export default function CashflowTab({ startDate }: Props) {
  const { data: registers } = useCashRegisters();

  const { data: payments } = useQuery({
    queryKey: ["report-payments-list", startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, orders(order_number), cash_registers(name)")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const { data: transfers } = useQuery({
    queryKey: ["report-cash-transfers", startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_transfers")
        .select("*, from:cash_registers!cash_transfers_from_register_id_fkey(name), to:cash_registers!cash_transfers_to_register_id_fkey(name)")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pieData = (() => {
    const byMethod: Record<string, number> = {};
    for (const p of payments || []) {
      const label = methodLabels[p.payment_method] || p.payment_method;
      byMethod[label] = (byMethod[label] || 0) + Number(p.amount);
    }
    return Object.entries(byMethod).map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(registers || []).map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Wallet className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">{r.name}</p>
              </div>
              <p className="text-xl font-bold mt-1">₪{Number(r.current_balance).toFixed(0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>התפלגות אמצעי תשלום</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`₪${v}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>העברות בין קופות</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>מקופה</TableHead>
                  <TableHead>לקופה</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>הערות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!(transfers?.length) ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">אין העברות</TableCell></TableRow>
                ) : transfers.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString("he-IL")}</TableCell>
                    <TableCell>{t.from?.name || "—"}</TableCell>
                    <TableCell>{t.to?.name || "—"}</TableCell>
                    <TableCell className="font-medium">₪{Number(t.amount).toFixed(0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>תשלומים בתקופה</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">הזמנה</TableHead>
                <TableHead className="text-right">אמצעי</TableHead>
                <TableHead className="text-right">קופה</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">הפניה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(payments?.length) ? (
                <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">אין תשלומים</TableCell></TableRow>
              ) : payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell>
                    <Link to={`/orders/${p.order_id}`} className="text-primary hover:underline flex items-center gap-1">
                      #{p.orders?.order_number} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell><Badge variant="outline">{methodLabels[p.payment_method] || p.payment_method}</Badge></TableCell>
                  <TableCell>{p.cash_registers?.name || "—"}</TableCell>
                  <TableCell className="font-medium">₪{Number(p.amount).toFixed(0)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.reference || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

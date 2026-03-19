import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown } from "lucide-react";

const sourceLabels: Record<string, string> = { credit_card: "כרטיס אשראי", cash_register: "קופה" };

interface Props {
  startDate: string;
}

export default function ExpensesTab({ startDate }: Props) {
  const { data: expenses } = useQuery({
    queryKey: ["report-expenses", startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, cash_registers(name)")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = useMemo(() => expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0, [expenses]);

  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses || []) {
      const date = new Date(e.created_at).toLocaleDateString("he-IL");
      map[date] = (map[date] || 0) + Number(e.amount);
    }
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  }, [expenses]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-2xl font-bold text-red-500">₪{total.toFixed(0)}</p>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <span className="text-muted-foreground">סה״כ הוצאות בתקופה</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>הוצאות לפי תאריך</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis />
              <Tooltip formatter={(v) => [`₪${v}`, "הוצאות"]} />
              <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>רשימת הוצאות</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">מקור תשלום</TableHead>
                <TableHead className="text-right">קופה</TableHead>
                <TableHead className="text-right">סכום</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(expenses?.length) ? (
                <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">אין הוצאות</TableCell></TableRow>
              ) : expenses.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleDateString("he-IL")}</TableCell>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell><Badge variant="outline">{sourceLabels[e.payment_source] || e.payment_source}</Badge></TableCell>
                  <TableCell>{e.cash_registers?.name || "—"}</TableCell>
                  <TableCell className="font-medium text-red-500">₪{Number(e.amount).toFixed(0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

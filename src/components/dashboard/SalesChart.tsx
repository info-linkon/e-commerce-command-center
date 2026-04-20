import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface SalesChartProps {
  startDate: string;
  endDate: string;
}

const SalesChart = ({ startDate, endDate }: SalesChartProps) => {
  const { data: orders } = useQuery({
    queryKey: ["dashboard-sales-chart", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .neq("status", "cancelled");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const chartData = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });

    const map = new Map<string, number>();
    for (const d of days) {
      map.set(format(d, "yyyy-MM-dd"), 0);
    }

    if (orders) {
      for (const o of orders) {
        const key = format(new Date(o.created_at), "yyyy-MM-dd");
        map.set(key, (map.get(key) || 0) + Number(o.total));
      }
    }

    return Array.from(map.entries()).map(([date, sales]) => ({
      name: days.length <= 7
        ? format(parseISO(date), "EEEE", { locale: he })
        : format(parseISO(date), "dd/MM"),
      sales,
    }));
  }, [orders, startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>מכירות לפי יום</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => [`₪${value}`, "מכירות"]} />
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SalesChart;

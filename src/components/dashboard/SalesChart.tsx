import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const SalesChart = () => {
  const { data: orders } = useQuery({
    queryKey: ["dashboard-weekly-sales"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at")
        .gte("created_at", weekAgo.toISOString())
        .eq("status", "completed");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const chartData = useMemo(() => {
    const result = dayNames.map((name) => ({ name, sales: 0 }));
    if (!orders) return result;
    for (const o of orders) {
      const day = new Date(o.created_at).getDay();
      result[day].sales += Number(o.total);
    }
    return result;
  }, [orders]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>מכירות שבועיות</CardTitle>
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

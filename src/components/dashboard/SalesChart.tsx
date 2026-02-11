import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "ראשון", sales: 0 },
  { name: "שני", sales: 0 },
  { name: "שלישי", sales: 0 },
  { name: "רביעי", sales: 0 },
  { name: "חמישי", sales: 0 },
  { name: "שישי", sales: 0 },
  { name: "שבת", sales: 0 },
];

const SalesChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>מכירות שבועיות</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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

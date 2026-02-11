import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";

const stats = [
  { title: "מכירות היום", value: "₪0", icon: DollarSign, description: "אין מכירות עדיין" },
  { title: "הזמנות ממתינות", value: "0", icon: ShoppingCart, description: "אין הזמנות ממתינות" },
  { title: "מלאי נמוך", value: "0", icon: Package, description: "פריטים מתחת לסף" },
  { title: "הכנסות החודש", value: "₪0", icon: TrendingUp, description: "סה\"כ הכנסות" },
];

const StatsCards = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

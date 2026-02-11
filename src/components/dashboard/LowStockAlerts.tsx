import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const LowStockAlerts = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <CardTitle>התראות מלאי נמוך</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-8">
          אין התראות מלאי נמוך
        </p>
      </CardContent>
    </Card>
  );
};

export default LowStockAlerts;

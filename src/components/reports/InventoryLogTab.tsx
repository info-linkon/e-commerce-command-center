import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventoryLog } from "@/hooks/useInventoryLog";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const actionLabels: Record<string, string> = {
  intake: "קליטה", sale: "מכירה", transfer_in: "העברה נכנסת", transfer_out: "העברה יוצאת", adjustment: "התאמה",
};
const actionColors: Record<string, string> = {
  intake: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  sale: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  transfer_in: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  transfer_out: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  adjustment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

interface Props {
  startDate: string;
}

export default function InventoryLogTab({ startDate }: Props) {
  const [warehouseId, setWarehouseId] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: warehouses } = useWarehouses();
  const { data: logs, isLoading } = useInventoryLog({
    warehouseId: warehouseId || undefined,
    actionType: (actionType || undefined) as any,
    dateFrom: startDate.split("T")[0],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-3 flex-wrap">
            <div>
              <Label className="text-xs">מחסן</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-36"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">סוג פעולה</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  {Object.entries(actionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <span>לוג תנועות מלאי</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">מוצר</TableHead>
              <TableHead className="text-right">וריאציה</TableHead>
              <TableHead className="text-right">מחסן</TableHead>
              <TableHead className="text-right">סוג</TableHead>
              <TableHead className="text-right">שינוי</TableHead>
              <TableHead className="text-right">אחרי</TableHead>
              <TableHead className="text-right">הפניה</TableHead>
              <TableHead className="text-right">הערות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !logs?.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">אין תנועות</TableCell></TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("he-IL")}</TableCell>
                  <TableCell>{log.product_variations?.products?.name || "—"}</TableCell>
                  <TableCell>{log.product_variations?.name || "—"}</TableCell>
                  <TableCell>{log.warehouses?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge className={`${actionColors[log.action_type] || ""} border-0`}>
                      {actionLabels[log.action_type] || log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={log.quantity_change > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </TableCell>
                  <TableCell>{log.quantity_after}</TableCell>
                  <TableCell>
                    {log.reference_id && (log.action_type === "sale") ? (
                      <Link to={`/orders/${log.reference_id}`} className="text-primary hover:underline flex items-center gap-1">
                        הזמנה <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : log.reference_id ? (
                      <span className="text-xs text-muted-foreground">{log.reference_id.slice(0, 8)}…</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{log.notes || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

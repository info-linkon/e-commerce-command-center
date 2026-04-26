import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityLog, useActivityUsers, type ActivityActionType } from "@/hooks/useActivityLog";

const actionLabels: Record<ActivityActionType, string> = {
  order_create: "הזמנה חדשה",
  order_update: "עדכון הזמנה",
  payment: "תשלום",
  intake: "קליטת מלאי",
  transfer: "העברת מלאי",
  adjustment: "התאמת מלאי",
  expense: "הוצאה",
  cash_transfer: "העברת קופה",
  document: "חשבונית",
};

const actionColors: Record<ActivityActionType, string> = {
  order_create: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  order_update: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  payment: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  intake: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  transfer: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  adjustment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  expense: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cash_transfer: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  document: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

interface Props {
  startDate: string;
  endDate?: string;
}

export default function ActivityLogTab({ startDate, endDate }: Props) {
  const [userId, setUserId] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: users } = useActivityUsers();
  const { data: entries, isLoading } = useActivityLog({
    dateFrom: startDate,
    dateTo: endDate,
    userId: userId || undefined,
    actionType: (actionType || undefined) as ActivityActionType | undefined,
  });

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-3 flex-wrap">
            <div>
              <Label className="text-xs">משתמש</Label>
              <Select value={userId || "all"} onValueChange={(v) => setUserId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המשתמשים</SelectItem>
                  {users?.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || "—"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">סוג פעולה</Label>
              <Select value={actionType || "all"} onValueChange={(v) => setActionType(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הפעולות</SelectItem>
                  {(Object.keys(actionLabels) as ActivityActionType[]).map((k) => (
                    <SelectItem key={k} value={k}>{actionLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <span>לוג פעילות משתמשים</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">תאריך</TableHead>
              <TableHead className="text-right">משתמש</TableHead>
              <TableHead className="text-right">סוג פעולה</TableHead>
              <TableHead className="text-right">תיאור</TableHead>
              <TableHead className="text-right">הפניה</TableHead>
              <TableHead className="text-right">סכום</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            ) : !entries?.length ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">אין פעילות בטווח שנבחר</TableCell></TableRow>
            ) : (
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(e.timestamp).toLocaleString("he-IL")}</TableCell>
                  <TableCell className="text-sm">{e.user_name || <span className="text-muted-foreground">מערכת</span>}</TableCell>
                  <TableCell>
                    <Badge className={`${actionColors[e.action_type]} border-0`}>{actionLabels[e.action_type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell>
                    {e.reference_link ? (
                      <Link to={e.reference_link} className="text-primary hover:underline flex items-center gap-1 text-xs">
                        {e.reference_label || "פתח"} <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : e.reference_label ? (
                      <span className="text-xs">{e.reference_label}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {e.amount != null ? `₪${e.amount.toFixed(2)}` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
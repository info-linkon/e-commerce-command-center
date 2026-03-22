import { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIntakeSessions, useIntakeSessionItems } from "@/hooks/useIntakeSessions";
import { format } from "date-fns";

const IntakeHistoryPage = () => {
  const { data: sessions, isLoading } = useIntakeSessions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      <div className="flex items-center gap-2">
        <History className="h-6 w-6" />
        <h1 className="text-2xl font-bold">היסטוריית קליטות</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">טוען...</p>
          ) : !sessions?.length ? (
            <p className="text-muted-foreground text-center py-8">אין קליטות עדיין</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>תאריך</TableHead>
                  <TableHead>מחסן</TableHead>
                  <TableHead>ספק</TableHead>
                  <TableHead>אסמכתא</TableHead>
                  <TableHead>פריטים</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <>
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                    >
                      <TableCell>
                        {expandedId === session.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>{format(new Date(session.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>{(session.warehouses as any)?.name}</TableCell>
                      <TableCell>{session.supplier_name || "—"}</TableCell>
                      <TableCell>{session.reference_number || "—"}</TableCell>
                      <TableCell>{session.total_items}</TableCell>
                      <TableCell>
                        <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                          {session.status === "completed" ? "הושלם" : "טיוטה"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedId === session.id && (
                      <TableRow key={`${session.id}-details`}>
                        <TableCell colSpan={7} className="p-0">
                          <SessionDetails sessionId={session.id} notes={session.notes} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function SessionDetails({ sessionId, notes }: { sessionId: string; notes: string | null }) {
  const { data: items, isLoading } = useIntakeSessionItems(sessionId);

  if (isLoading) return <p className="p-4 text-muted-foreground">טוען פריטים...</p>;

  return (
    <div className="bg-muted/30 p-4 space-y-3">
      {notes && <p className="text-sm text-muted-foreground">הערות: {notes}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>מוצר</TableHead>
            <TableHead>וריאציה</TableHead>
            <TableHead>כמות</TableHead>
            <TableHead>עלות ליח׳</TableHead>
            <TableHead>סה״כ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{(item.product_variations as any)?.products?.name || "—"}</TableCell>
              <TableCell>{(item.product_variations as any)?.name}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>₪{Number(item.cost_price).toFixed(2)}</TableCell>
              <TableCell className="font-medium">₪{(item.quantity * Number(item.cost_price)).toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items && items.length > 0 && (
        <p className="text-sm font-medium">
          סה״כ עלות: ₪{items.reduce((s, i) => s + i.quantity * Number(i.cost_price), 0).toFixed(2)}
        </p>
      )}
    </div>
  );
}

export default IntakeHistoryPage;

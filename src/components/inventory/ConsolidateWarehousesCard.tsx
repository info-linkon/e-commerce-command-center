import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Merge, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useMainWarehouseId, useWarehouses } from "@/hooks/useWarehouses";
import { useConsolidateWarehouses } from "@/hooks/useInventoryTransfers";
import { planConsolidation, type InventoryRow } from "@/lib/warehouse-consolidation";

// Merge all warehouses into one main warehouse (client notes §7.3). Shows
// what will move before anything is written.
export function ConsolidateWarehousesCard() {
  const { data: warehouses } = useWarehouses();
  const { data: mainWarehouseId } = useMainWarehouseId();
  const consolidate = useConsolidateWarehouses();
  const [target, setTarget] = useState<string>("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["inventory", "all-rows-for-consolidation"],
    queryFn: async () => {
      const all: InventoryRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("inventory")
          .select("variation_id, warehouse_id, quantity")
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...((data || []) as InventoryRow[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const perWarehouse = useMemo(() => {
    const m = new Map<string, { units: number; rows: number; negative: number }>();
    for (const r of rows || []) {
      const q = Number(r.quantity) || 0;
      const cur = m.get(r.warehouse_id) || { units: 0, rows: 0, negative: 0 };
      cur.units += q;
      if (q !== 0) cur.rows++;
      if (q < 0) cur.negative++;
      m.set(r.warehouse_id, cur);
    }
    return m;
  }, [rows]);

  // Default target: the saved main warehouse, else the one holding most stock.
  const defaultTarget = useMemo(() => {
    if (mainWarehouseId) return mainWarehouseId;
    let best = "";
    let bestUnits = -Infinity;
    for (const w of warehouses || []) {
      const u = perWarehouse.get(w.id)?.units ?? 0;
      if (u > bestUnits) { best = w.id; bestUnits = u; }
    }
    return best;
  }, [mainWarehouseId, warehouses, perWarehouse]);
  const targetId = target || defaultTarget;
  const targetName = warehouses?.find((w) => w.id === targetId)?.name || "";

  const plan = useMemo(() => (rows && targetId ? planConsolidation(rows, targetId) : null), [rows, targetId]);
  const otherActive = (warehouses || []).filter((w) => w.id !== targetId && w.is_active).length;
  const nothingToDo = !!plan && plan.moves.size === 0 && otherActive === 0 && mainWarehouseId === targetId;

  const run = () => {
    setProgress({ done: 0, total: 0 });
    consolidate.mutate(
      { targetId, onProgress: (done, total) => setProgress({ done, total }) },
      { onSettled: () => setProgress(null) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Merge className="h-5 w-5" />
          איחוד כל המחסנים למחסן אחד
        </CardTitle>
        <CardDescription>
          מעביר את כל המלאי מכל המחסנים למחסן הראשי, מכבה את שאר המחסנים, ומגדיר את המחסן הראשי כברירת המחדל לשיוך הזמנות
          (אתר, קופה ומארזים). כל העברה נרשמת בהעברות מלאי וביומן המלאי.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">מחסן ראשי:</span>
          <Select value={targetId} onValueChange={setTarget} dir="rtl">
            <SelectTrigger className="w-56"><SelectValue placeholder="בחר מחסן" /></SelectTrigger>
            <SelectContent>
              {(warehouses || []).map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}{w.id === mainWarehouseId ? " (ראשי)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">מחסן</TableHead>
              <TableHead className="text-right">יחידות</TableHead>
              <TableHead className="text-right">שורות מלאי</TableHead>
              <TableHead className="text-right">שורות במינוס</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(warehouses || []).map((w) => {
              const s = perWarehouse.get(w.id) || { units: 0, rows: 0, negative: 0 };
              return (
                <TableRow key={w.id} className={w.id === targetId ? "bg-primary/5 font-medium" : ""}>
                  <TableCell>{w.name}{w.id === targetId ? " ← יעד" : ""}{!w.is_active ? " (לא פעיל)" : ""}</TableCell>
                  <TableCell>{s.units}</TableCell>
                  <TableCell>{s.rows}</TableCell>
                  <TableCell className={s.negative ? "text-destructive" : ""}>{s.negative}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {plan && (
          <p className="text-sm text-muted-foreground">
            אחרי האיחוד: כל המלאי ב-<b>{targetName}</b>.{" "}
            {plan.negativeAfter
              ? <span className="text-destructive">{plan.negativeAfter} מוצרים יישארו במינוס גם אחרי החיבור (המלאי המשולב שלהם שלילי) — צריך לעדכן להם ספירת מלאי.</span>
              : "לא יישאר מלאי במינוס."}
          </p>
        )}

        {progress && progress.total > 0 && (
          <div className="space-y-1">
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="text-xs text-muted-foreground">{progress.done} / {progress.total}</p>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!plan || !targetId || nothingToDo || consolidate.isPending}>
              {consolidate.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {nothingToDo ? "המחסנים כבר מאוחדים" : `אחד הכל ל-${targetName}`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>לאחד את כל המחסנים ל-{targetName}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-right">
                <span className="block">• כל המלאי מהמחסנים האחרים יועבר ל-{targetName} (כולל שורות במינוס).</span>
                <span className="block">• שאר המחסנים יסומנו "לא פעיל" (לא יימחקו).</span>
                <span className="block">• הזמנות שמשויכות למחסנים האחרים ישויכו ל-{targetName}.</span>
                <span className="block">• עדיף לבצע כשאין מכירות פעילות. אל תסגור את הדף עד הסיום.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={run}>אחד עכשיו</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

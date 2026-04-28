import { useState } from "react";
import { Wallet, ArrowLeftRight, Plus, History, ArrowDownLeft, ArrowUpRight, Receipt, CreditCard, Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCashRegisters, useCreateCashRegister, useCashRegisterTransactions, useSetCashRegisterBalance, useSetCashRegisterOpeningBalance } from "@/hooks/useCashRegisters";
import { useCashTransfers, useCreateCashTransfer } from "@/hooks/useCashTransfers";
import { useIsOwner } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type RegisterBreakdown = {
  opening: number;
  payments: number;
  expenses: number; // positive number representing total expenses
  transfersIn: number;
  transfersOut: number; // positive number
  computed: number;
};

function useRegistersBreakdown(registerIds: string[]) {
  return useQuery({
    queryKey: ["registers-breakdown", registerIds.sort().join(",")],
    enabled: registerIds.length > 0,
    queryFn: async (): Promise<Record<string, RegisterBreakdown>> => {
      const [paymentsRes, expensesRes, transfersRes, registersRes] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, cash_register_id, payment_method, orders(status)")
          .in("cash_register_id", registerIds),
        supabase
          .from("expenses")
          .select("amount, cash_register_id")
          .eq("payment_source", "cash_register")
          .in("cash_register_id", registerIds),
        supabase
          .from("cash_transfers")
          .select("amount, from_register_id, to_register_id")
          .or(
            `from_register_id.in.(${registerIds.join(",")}),to_register_id.in.(${registerIds.join(",")})`,
          ),
        supabase
          .from("cash_registers")
          .select("id, opening_balance, requires_completed_order")
          .in("id", registerIds),
      ]);
      if (paymentsRes.error) throw paymentsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (transfersRes.error) throw transfersRes.error;
      if (registersRes.error) throw registersRes.error;

      const result: Record<string, RegisterBreakdown> = {};
      for (const r of registersRes.data || []) {
        result[r.id] = {
          opening: Number(r.opening_balance || 0),
          payments: 0,
          expenses: 0,
          transfersIn: 0,
          transfersOut: 0,
          computed: 0,
        };
      }
      const requiresCompleted: Record<string, boolean> = {};
      for (const r of registersRes.data || []) {
        requiresCompleted[r.id] = !!(r as any).requires_completed_order;
      }

      for (const p of paymentsRes.data || []) {
        const rid = (p as any).cash_register_id;
        if (!rid || !result[rid]) continue;
        const status = (p as any).orders?.status;
        // Mirror the DB trigger: deferred registers only count cash payments from completed orders.
        if (requiresCompleted[rid] && (p as any).payment_method === "cash" && status !== "completed") continue;
        result[rid].payments += Number((p as any).amount);
      }
      for (const e of expensesRes.data || []) {
        const rid = (e as any).cash_register_id;
        if (!rid || !result[rid]) continue;
        result[rid].expenses += Number((e as any).amount);
      }
      for (const t of transfersRes.data || []) {
        const fromId = (t as any).from_register_id;
        const toId = (t as any).to_register_id;
        const amt = Number((t as any).amount);
        if (toId && result[toId]) result[toId].transfersIn += amt;
        if (fromId && result[fromId]) result[fromId].transfersOut += amt;
      }
      for (const id of Object.keys(result)) {
        const b = result[id];
        b.computed = b.opening + b.payments - b.expenses + b.transfersIn - b.transfersOut;
      }
      return result;
    },
  });
}

const CashRegistersPage = () => {
  const { data: registers, isLoading } = useCashRegisters();
  const { data: transfers } = useCashTransfers();
  const createRegister = useCreateCashRegister();
  const createTransfer = useCreateCashTransfer();
  const setBalance = useSetCashRegisterBalance();
  const setOpeningBalance = useSetCashRegisterOpeningBalance();
  const { isOwner } = useIsOwner();

  const [newOpen, setNewOpen] = useState(false);
  const [regName, setRegName] = useState("");
  const [regBalance, setRegBalance] = useState("");

  const [transferOpen, setTransferOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [txRegisterId, setTxRegisterId] = useState<string | null>(null);
  const txRegister = registers?.find((r) => r.id === txRegisterId);
  const { data: transactions, isLoading: txLoading } = useCashRegisterTransactions(txRegisterId);

  // Settings dialog (owner only)
  const [settingsRegisterId, setSettingsRegisterId] = useState<string | null>(null);
  const settingsRegister = registers?.find((r) => r.id === settingsRegisterId);
  const [openingInput, setOpeningInput] = useState("");
  const [balanceInput, setBalanceInput] = useState("");

  const openSettings = (r: { id: string; opening_balance: number; current_balance: number }) => {
    setSettingsRegisterId(r.id);
    setOpeningInput(String(Number(r.opening_balance)));
    setBalanceInput(String(Number(r.current_balance)));
  };

  const handleSaveOpening = () => {
    if (!settingsRegisterId) return;
    const v = parseFloat(openingInput);
    if (!isFinite(v)) return;
    setOpeningBalance.mutate({ id: settingsRegisterId, opening_balance: v });
  };

  const handleSaveBalance = () => {
    if (!settingsRegisterId) return;
    const v = parseFloat(balanceInput);
    if (!isFinite(v)) return;
    setBalance.mutate({ id: settingsRegisterId, current_balance: v });
  };

  const handleResetBalance = () => {
    if (!settingsRegisterId || !settingsRegister) return;
    if (!confirm(`לאפס את היתרה הנוכחית של "${settingsRegister.name}" לאפס? פעולה זו אינה משפיעה על היסטוריית התנועות.`)) return;
    setBalance.mutate(
      { id: settingsRegisterId, current_balance: 0 },
      { onSuccess: () => setBalanceInput("0") },
    );
  };

  const handleCreateRegister = () => {
    if (!regName.trim()) return;
    createRegister.mutate(
      { name: regName.trim(), opening_balance: parseFloat(regBalance) || 0 },
      { onSuccess: () => { setNewOpen(false); setRegName(""); setRegBalance(""); } }
    );
  };

  const handleTransfer = () => {
    if (!fromId || !toId || !amount || fromId === toId) return;
    createTransfer.mutate(
      { from_register_id: fromId, to_register_id: toId, amount: parseFloat(amount), notes: notes || undefined },
      { onSuccess: () => { setTransferOpen(false); setFromId(""); setToId(""); setAmount(""); setNotes(""); } }
    );
  };

  const activeRegisters = registers?.filter((r) => r.is_active) || [];

  const registerIds = (registers || []).map((r) => r.id);
  const { data: breakdowns } = useRegistersBreakdown(registerIds);

  // Total of all registers excluding bank account and HYP (credit gateway)
  const isExcludedFromTotal = (name: string) => {
    const n = name.toLowerCase();
    return n.includes("hyp") || n.includes("חשבון בנק") || n.includes("בנק");
  };
  const cashTotal = (registers || [])
    .filter((r) => r.is_active && !isExcludedFromTotal(r.name))
    .reduce((sum, r) => sum + Number(r.current_balance || 0), 0);
  const cashTotalCount = (registers || []).filter(
    (r) => r.is_active && !isExcludedFromTotal(r.name),
  ).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          קופות
        </h1>
        <div className="flex gap-2">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                העברת כספים
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>העברת כספים בין קופות</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>מקופה</Label>
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger><SelectValue placeholder="בחר קופה..." /></SelectTrigger>
                    <SelectContent>
                      {activeRegisters.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} (₪{Number(r.current_balance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>לקופה</Label>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger><SelectValue placeholder="בחר קופה..." /></SelectTrigger>
                    <SelectContent>
                      {activeRegisters.filter((r) => r.id !== fromId).map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} (₪{Number(r.current_balance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>סכום</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
                </div>
                <div>
                  <Label>הערות (אופציונלי)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={handleTransfer} disabled={!fromId || !toId || !amount || fromId === toId || createTransfer.isPending} className="w-full">
                  {createTransfer.isPending ? "מעביר..." : "בצע העברה"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isOwner && <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />קופה חדשה</Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>קופה חדשה</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>שם</Label>
                  <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="שם הקופה" />
                </div>
                <div>
                  <Label>יתרת פתיחה</Label>
                  <Input type="number" value={regBalance} onChange={(e) => setRegBalance(e.target.value)} min="0" step="0.01" />
                </div>
                <Button onClick={handleCreateRegister} disabled={!regName.trim() || createRegister.isPending} className="w-full">
                  {createRegister.isPending ? "יוצר..." : "צור קופה"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>}
        </div>
      </div>

      {/* Register Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">טוען...</div>
        ) : !registers?.length ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">אין קופות</div>
        ) : (
          registers.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{r.name}</span>
                  {!r.is_active && <Badge variant="outline" className="text-xs">לא פעיל</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₪{Number(r.current_balance).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  יתרת פתיחה: ₪{Number(r.opening_balance).toFixed(2)}
                </div>
                {breakdowns?.[r.id] && (() => {
                  const b = breakdowns[r.id];
                  const actual = Number(r.current_balance);
                  const diff = actual - b.computed;
                  return (
                    <div className="mt-3 rounded-md border bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">יתרת פתיחה</span>
                        <span className="font-medium">₪{b.opening.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">+ תשלומים</span>
                        <span className="font-medium text-green-700">+₪{b.payments.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">− הוצאות</span>
                        <span className="font-medium text-red-700">−₪{b.expenses.toFixed(2)}</span>
                      </div>
                      {(b.transfersIn > 0 || b.transfersOut > 0) && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">± העברות</span>
                          <span className="font-medium">
                            <span className="text-green-700">+₪{b.transfersIn.toFixed(2)}</span>
                            {" / "}
                            <span className="text-red-700">−₪{b.transfersOut.toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-muted-foreground">= מחושב</span>
                        <span className="font-bold">₪{b.computed.toFixed(2)}</span>
                      </div>
                      {Math.abs(diff) > 0.01 && (
                        <div className="flex justify-between text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                          <span>פער מול יתרה ב-DB</span>
                          <span className="font-bold">{diff >= 0 ? "+" : "−"}₪{Math.abs(diff).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 gap-2"
                  onClick={() => setTxRegisterId(r.id)}
                >
                  <History className="h-4 w-4" />
                  צפייה בתנועות
                </Button>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={() => openSettings(r)}
                  >
                    <Settings className="h-4 w-4" />
                    הגדרות קופה
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Settings Dialog (owner only) */}
      {isOwner && (
        <Dialog open={!!settingsRegisterId} onOpenChange={(o) => !o && setSettingsRegisterId(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                הגדרות קופה{settingsRegister ? ` — ${settingsRegister.name}` : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>יתרת פתיחה (סכום התחלתי)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={openingInput}
                    onChange={(e) => setOpeningInput(e.target.value)}
                    step="0.01"
                  />
                  <Button onClick={handleSaveOpening} disabled={setOpeningBalance.isPending}>
                    שמור
                  </Button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label>יתרה נוכחית</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    step="0.01"
                  />
                  <Button onClick={handleSaveBalance} disabled={setBalance.isPending}>
                    שמור
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full gap-2 mt-2"
                  onClick={handleResetBalance}
                  disabled={setBalance.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                  אפס יתרה לאפס
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Transactions Dialog */}
      <Dialog open={!!txRegisterId} onOpenChange={(o) => !o && setTxRegisterId(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              תנועות קופה{txRegister ? ` — ${txRegister.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {txRegister && (
            (() => {
              const opening = Number(txRegister.opening_balance || 0);
              const txSum = (transactions || []).reduce((s, t) => s + Number(t.amount), 0);
              const computed = opening + txSum;
              const actual = Number(txRegister.current_balance);
              const diff = actual - computed;
              return (
                <div className="px-1 pb-2 border-b text-sm space-y-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-muted-foreground">יתרה נוכחית:</span>
                    <span className="font-bold text-lg">₪{actual.toFixed(2)}</span>
                    <span className="text-muted-foreground mr-auto">
                      {transactions?.length || 0} תנועות
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span>יתרת פתיחה: <span className="font-medium text-foreground">₪{opening.toFixed(2)}</span></span>
                    <span>+ סיכום תנועות: <span className={`font-medium ${txSum >= 0 ? "text-green-700" : "text-red-700"}`}>{txSum >= 0 ? "+" : "−"}₪{Math.abs(txSum).toFixed(2)}</span></span>
                    <span>= מחושב: <span className="font-medium text-foreground">₪{computed.toFixed(2)}</span></span>
                    {Math.abs(diff) > 0.01 && (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                        פער: {diff >= 0 ? "+" : "−"}₪{Math.abs(diff).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          )}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {txLoading ? (
              <div className="py-12 text-center text-muted-foreground">טוען...</div>
            ) : !transactions?.length ? (
              <div className="py-12 text-center text-muted-foreground">אין תנועות בקופה זו</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">סוג</TableHead>
                    <TableHead className="text-right">תיאור</TableHead>
                    <TableHead className="text-right">סטטוס הזמנה</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const typeMeta = {
                      payment: { label: "תשלום", icon: CreditCard, cls: "text-green-700 bg-green-50 border-green-200" },
                      expense: { label: "הוצאה", icon: Receipt, cls: "text-red-700 bg-red-50 border-red-200" },
                      transfer_in: { label: "העברה נכנסת", icon: ArrowDownLeft, cls: "text-blue-700 bg-blue-50 border-blue-200" },
                      transfer_out: { label: "העברה יוצאת", icon: ArrowUpRight, cls: "text-orange-700 bg-orange-50 border-orange-200" },
                    }[t.type];
                    const Icon = typeMeta.icon;
                    const statusMeta: Record<string, { label: string; cls: string }> = {
                      pending: { label: "ממתינה", cls: "text-amber-700 bg-amber-50 border-amber-200" },
                      processing: { label: "בעיבוד", cls: "text-blue-700 bg-blue-50 border-blue-200" },
                      picking: { label: "בליקוט", cls: "text-indigo-700 bg-indigo-50 border-indigo-200" },
                      shipping: { label: "במשלוח", cls: "text-purple-700 bg-purple-50 border-purple-200" },
                      completed: { label: "הושלמה", cls: "text-green-700 bg-green-50 border-green-200" },
                      cancelled: { label: "בוטלה", cls: "text-red-700 bg-red-50 border-red-200" },
                    };
                    const status = t.order_status ? statusMeta[t.order_status] : null;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${typeMeta.cls}`}>
                            <Icon className="h-3 w-3" />
                            {typeMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {t.description}
                          {t.reference && <div className="text-xs text-muted-foreground">{t.reference}</div>}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <Badge variant="outline" className={status.cls}>{status.label}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className={`font-bold ${t.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {t.amount >= 0 ? "+" : "−"}₪{Math.abs(t.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString("he-IL")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Transfers */}
      {transfers && transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              העברות אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מקופה</TableHead>
                  <TableHead className="text-right">לקופה</TableHead>
                  <TableHead className="text-right">סכום</TableHead>
                  <TableHead className="text-right">הערות</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.from?.name || "—"}</TableCell>
                    <TableCell>{t.to?.name || "—"}</TableCell>
                    <TableCell className="font-medium">₪{Number(t.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.notes || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("he-IL")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cash total (excluding bank account & HYP) */}
      <div className="pt-2 pb-4 text-center text-xs text-muted-foreground">
        סך הכל בקופות ({cashTotalCount}) — ללא חשבון בנק ו-HYP:{" "}
        <span className="font-semibold text-foreground">₪{cashTotal.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default CashRegistersPage;

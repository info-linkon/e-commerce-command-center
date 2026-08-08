import { useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Plus, Trash2, Pencil, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SmsComposer from "@/components/sms/SmsComposer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useMarketingSmsTemplates, useSaveMarketingSmsTemplate,
  useDeleteMarketingSmsTemplate, useSendBulkSms, type BulkSmsResult,
} from "@/hooks/useMarketingSms";
import { countSmsChars, SMS_MAX_CHARS } from "@/lib/sms-text";
import { toast } from "sonner";

const ORDER_STATUSES = [
  { value: "all", label: "כל הסטטוסים" },
  { value: "completed", label: "הושלמה" },
  { value: "delivered", label: "נמסרה" },
  { value: "processing", label: "בטיפול" },
  { value: "pending", label: "ממתינה" },
  { value: "cancelled", label: "בוטלה" },
];

interface Recipient {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
}

const SmsCampaignPage = () => {
  const [city, setCity] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<BulkSmsResult | null>(null);
  const [csvRecipients, setCsvRecipients] = useState<Recipient[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tplDialog, setTplDialog] = useState(false);
  const [tplForm, setTplForm] = useState<{ id?: string; name: string; body: string; locale: string }>({
    name: "", body: "", locale: "he",
  });

  const { data: templates } = useMarketingSmsTemplates();
  const saveTpl = useSaveMarketingSmsTemplate();
  const deleteTpl = useDeleteMarketingSmsTemplate();
  const bulkSend = useSendBulkSms();

  const { data: customersRaw, isLoading } = useQuery({
    queryKey: ["campaign-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, city")
        .order("name")
        .limit(5000);
      if (error) throw error;
      return (data || []) as Recipient[];
    },
  });

  // Orders always loaded so every customer who ever purchased is included,
  // including POS / website orders with no customers row.
  const orderFilterActive = status !== "all" || !!fromDate || !!toDate;
  const { data: orders } = useQuery({
    queryKey: ["campaign-orders", status, fromDate, toDate],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("customer_id, customer_name, customer_phone, shipping_city, status, created_at")
        .order("created_at", { ascending: false });
      if (status !== "all") q = q.eq("status", status as any);
      if (fromDate) q = q.gte("created_at", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        q = q.lte("created_at", end.toISOString());
      }
      const { data, error } = await q.limit(10000);
      if (error) throw error;
      return data || [];
    },
  });

  const normPhone = (p?: string | null) => (p || "").replace(/\D/g, "");

  // Unified recipient list: customers table + anyone who ever placed an order
  const customers = useMemo(() => {
    const list: Recipient[] = [];
    const seen = new Set<string>();

    for (const c of customersRaw || []) {
      const key = normPhone(c.phone);
      if (key) seen.add(key);
      list.push(c);
    }

    for (const o of (orders || []) as any[]) {
      const key = normPhone(o.customer_phone);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push({
        id: `order:${key}`,
        name: o.customer_name || o.customer_phone,
        phone: o.customer_phone,
        city: o.shipping_city || null,
      });
    }

    return list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
  }, [customersRaw, orders]);

  const cities = useMemo(
    () => Array.from(new Set((customers || []).map((c) => c.city).filter(Boolean))) as string[],
    [customers],
  );

  const filtered = useMemo(() => {
    let list = customers || [];
    if (city !== "all") list = list.filter((c) => c.city === city);
    if (orderFilterActive) {
      const ids = new Set((orders || []).map((o: any) => o.customer_id).filter(Boolean));
      const phones = new Set((orders || []).map((o: any) => normPhone(o.customer_phone)).filter(Boolean));
      list = list.filter((c) => ids.has(c.id) || (c.phone && phones.has(normPhone(c.phone))));
    }
    if (csvRecipients.length) {
      const existing = new Set(list.map((c) => normPhone(c.phone)).filter(Boolean));
      list = [...csvRecipients.filter((c) => !existing.has(normPhone(c.phone))), ...list];
    }
    return list;
  }, [customers, city, orderFilterActive, orders, csvRecipients]);

  const handleCsv = async (file: File) => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: Recipient[] = [];
    const seen = new Set<string>();
    for (const [i, row] of rows.entries()) {
      const cells = row.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cells[0] || "";
      const phoneRaw = cells[1] || "";
      const phone = normPhone(phoneRaw);
      if (!phone || phone.length < 9) continue; // skip header / invalid
      if (i === 0 && /phone|טלפון|هاتف/i.test(row)) continue;
      if (seen.has(phone)) continue;
      seen.add(phone);
      parsed.push({ id: `csv:${phone}`, name: name || phoneRaw, phone: phoneRaw, city: null });
    }
    if (!parsed.length) {
      toast.error("לא נמצאו נמענים תקינים בקובץ");
      return;
    }
    setCsvRecipients((prev) => {
      const map = new Map(prev.map((p) => [normPhone(p.phone), p]));
      parsed.forEach((p) => map.set(normPhone(p.phone), p));
      return Array.from(map.values());
    });
    setSelected((prev) => {
      const next = new Set(prev);
      parsed.forEach((p) => next.add(p.id));
      return next;
    });
    toast.success(`נוספו ${parsed.length} נמענים מהקובץ`);
  };

  const withPhone = filtered.filter((c) => !!c.phone);
  const selectedRecipients = filtered.filter((c) => selected.has(c.id) && c.phone);
  const allSelected = withPhone.length > 0 && withPhone.every((c) => selected.has(c.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) withPhone.forEach((c) => next.delete(c.id));
      else withPhone.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tooLong = countSmsChars(message) > SMS_MAX_CHARS;
  const canSend = selectedRecipients.length > 0 && message.trim().length > 0 && !tooLong;

  const handleSend = async () => {
    setConfirmOpen(false);
    const res = await bulkSend.mutateAsync({
      message,
      recipients: selectedRecipients.map((c) => ({
        phone: c.phone!,
        name: c.name,
        customer_id: c.id.startsWith("order:") || c.id.startsWith("csv:") ? undefined : c.id,
      })),
    });
    setResult(res);
    toast.success(`נשלחו ${res.sent} הודעות · נכשלו ${res.failed} · דולגו ${res.skipped}`);
  };

  const openTpl = (t?: { id: string; name: string; body: string; locale: string }) => {
    setTplForm(t ? { id: t.id, name: t.name, body: t.body, locale: t.locale } : { name: "", body: "", locale: "he" });
    setTplDialog(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        שליחת SMS ללקוחות
      </h1>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">סינון נמענים</CardTitle>
          <CardDescription>ללא סינון מוצגים כל הלקוחות. הסינון הוא אופציונלי.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>עיר</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הערים</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>סטטוס הזמנה</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>הזמנות מתאריך</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>עד תאריך</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">נמענים</CardTitle>
            <CardDescription>
              {filtered.length} לקוחות · {withPhone.length} עם טלפון · נבחרו {selectedRecipients.length}
              {csvRecipients.length ? ` · ${csvRecipients.length} מקובץ CSV` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1">
              <Upload className="h-4 w-4" />ייבוא CSV
            </Button>
            {!!csvRecipients.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    csvRecipients.forEach((c) => next.delete(c.id));
                    return next;
                  });
                  setCsvRecipients([]);
                }}
              >
                נקה CSV
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={!withPhone.length}>
              {allSelected ? "נקה בחירה" : "בחר הכל"}
            </Button>
          </div>
        </CardHeader>
        <CardDescription className="px-6 -mt-2 text-xs">
          מבנה הקובץ: עמודה ראשונה שם, עמודה שנייה טלפון
        </CardDescription>
        <CardContent>
          <div className="border rounded-lg max-h-80 overflow-auto divide-y">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">טוען...</div>
            ) : !filtered.length ? (
              <div className="p-4 text-center text-muted-foreground">אין לקוחות תואמים</div>
            ) : (
              filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={selected.has(c.id)} disabled={!c.phone} onCheckedChange={() => toggleOne(c.id)} />
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  {c.id.startsWith("csv:") && <Badge variant="secondary" className="text-[10px]">CSV</Badge>}
                  <span className="text-xs text-muted-foreground">{c.city || ""}</span>
                  <span className="text-xs" dir="ltr">{c.phone || "ללא טלפון"}</span>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">תוכן ההודעה</CardTitle>
            <CardDescription>עד {SMS_MAX_CHARS} תווים · אימוג'ים נתמכים</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => openTpl()}>
            <Plus className="h-4 w-4 ml-1" />תבנית חדשה
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!!templates?.length && (
            <div className="space-y-2">
              <Label>תבניות שמורות</Label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 border rounded-full ps-2 pe-1 py-0.5">
                    <button className="text-sm" onClick={() => setMessage(t.body)}>{t.name}</button>
                    <Badge variant="secondary" className="text-[10px]">{t.locale === "ar" ? "ع" : "עב"}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openTpl(t)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTpl.mutate(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SmsComposer value={message} onChange={setMessage} rows={6} />
          <p className="text-xs text-muted-foreground">משתנים: {"{customer_name}"} · {"{phone}"}</p>

          <Button onClick={() => setConfirmOpen(true)} disabled={!canSend || bulkSend.isPending} className="gap-2">
            <Send className="h-4 w-4" />
            {bulkSend.isPending ? "שולח..." : `שלח ל-${selectedRecipients.length} לקוחות`}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">תוצאות השליחה</CardTitle>
            <CardDescription>
              נשלחו {result.sent} · נכשלו {result.failed} · דולגו {result.skipped}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg max-h-64 overflow-auto divide-y text-sm">
              {result.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <span>{d.name || "—"}</span>
                  <span dir="ltr" className="text-muted-foreground text-xs">{d.phone}</span>
                  <Badge variant={d.status === "sent" ? "default" : "destructive"}>
                    {d.status === "sent" ? "נשלח" : d.status === "skipped" ? `דולג: ${d.error}` : `נכשל: ${d.error}`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור שליחה</AlertDialogTitle>
            <AlertDialogDescription>
              ההודעה תישלח ל-{selectedRecipients.length} לקוחות. לקוחות ללא מספר תקין ידולגו אוטומטית.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>שלח עכשיו</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template editor */}
      <Dialog open={tplDialog} onOpenChange={setTplDialog}>
        <DialogContent className="sm:max-w-lg w-[95vw]" dir="rtl">
          <DialogHeader><DialogTitle>{tplForm.id ? "עריכת תבנית" : "תבנית חדשה"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>שם התבנית</Label>
              <Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>שפה</Label>
              <Select value={tplForm.locale} onValueChange={(v) => setTplForm({ ...tplForm, locale: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">עברית</SelectItem>
                  <SelectItem value="ar">ערבית</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>תוכן</Label>
              <SmsComposer value={tplForm.body} onChange={(v) => setTplForm({ ...tplForm, body: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialog(false)}>ביטול</Button>
            <Button
              disabled={!tplForm.name.trim() || !tplForm.body.trim() || saveTpl.isPending}
              onClick={() => saveTpl.mutate(tplForm, { onSuccess: () => setTplDialog(false) })}
            >
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmsCampaignPage;
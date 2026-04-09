import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2, Info, Phone, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const triggerLabels: Record<string, string> = {
  order_created: "הזמנה חדשה",
  order_shipped: "הזמנה נשלחה",
  order_completed: "הזמנה הושלמה",
};

const placeholders = [
  { key: "{customer_name}", desc: "שם הלקוח" },
  { key: "{order_number}", desc: "מספר הזמנה" },
  { key: "{total}", desc: "סכום ההזמנה" },
  { key: "{phone}", desc: "טלפון הלקוח" },
  { key: "{status}", desc: "סטטוס ההזמנה" },
];

export default function SmsTemplatesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState("order_created");
  const [templateText, setTemplateText] = useState("");
  const [recipientType, setRecipientType] = useState("customer");
  const [recipientPhone, setRecipientPhone] = useState("");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["sms-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: { id?: string; trigger: string; template_text: string; recipient_type: string; recipient_phone?: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("sms_templates")
          .update({ trigger: values.trigger as any, template_text: values.template_text, recipient_type: values.recipient_type, recipient_phone: values.recipient_phone || null })
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sms_templates")
          .insert({ trigger: values.trigger as any, template_text: values.template_text, recipient_type: values.recipient_type, recipient_phone: values.recipient_phone || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.success("התבנית נשמרה");
      resetForm();
    },
    onError: () => toast.error("שגיאה בשמירת תבנית"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("sms_templates").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-templates"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.success("התבנית נמחקה");
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditingId(null);
    setTrigger("order_created");
    setTemplateText("");
    setRecipientType("customer");
    setRecipientPhone("");
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setTrigger(t.trigger);
    setTemplateText(t.template_text);
    setRecipientType(t.recipient_type || "customer");
    setRecipientPhone(t.recipient_phone || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    upsertMutation.mutate({ id: editingId || undefined, trigger, template_text: templateText, recipient_type: recipientType, recipient_phone: recipientType === "custom" ? recipientPhone : undefined });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          תבניות SMS
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />תבנית חדשה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "עריכת תבנית" : "תבנית חדשה"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>טריגר</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>נמען</Label>
                <RadioGroup value={recipientType} onValueChange={setRecipientType} className="mt-2 space-y-2">
                  <label className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${recipientType === "customer" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="customer" id="r-customer" />
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">טלפון הלקוח (מההזמנה)</span>
                  </label>
                  <label className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${recipientType === "custom" ? "border-primary bg-primary/5" : "border-border"}`}>
                    <RadioGroupItem value="custom" id="r-custom" />
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">מספר מותאם (מנהל)</span>
                  </label>
                </RadioGroup>
                {recipientType === "custom" && (
                  <Input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="mt-2"
                    dir="ltr"
                  />
                )}
              </div>
              <div>
                <Label>טקסט ההודעה</Label>
                <Textarea
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="mt-1 min-h-[100px]"
                  placeholder="שלום {customer_name}, הזמנה #{order_number} התקבלה בהצלחה!"
                  dir="rtl"
                />
                {templateText.length > 0 && (() => {
                  const len = templateText.length;
                  const smsCount = len <= 267 ? 1 : len <= 536 ? 2 : Math.ceil(len / 267);
                  return (
                    <p className={`text-xs mt-1 ${smsCount > 1 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {len} תווים · {smsCount === 1 ? "הודעה אחת" : `${smsCount} הודעות`}
                      {" "}
                      <span className="text-muted-foreground">(לא כולל אורך הפרמטרים)</span>
                    </p>
                  );
                })()}
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <Info className="h-3 w-3" />
                  Placeholders זמינים:
                </p>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map((p) => (
                    <Badge
                      key={p.key}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-primary/10"
                      onClick={() => setTemplateText((t) => t + p.key)}
                    >
                      {p.key} — {p.desc}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} disabled={!templateText.trim() || upsertMutation.isPending} className="w-full">
                {upsertMutation.isPending ? "שומר..." : "שמור"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">טוען...</div>
      ) : !templates?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            אין תבניות SMS עדיין. צור תבנית חדשה כדי לשלוח הודעות אוטומטיות.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t: any) => (
            <Card key={t.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1" onClick={() => handleEdit(t)} role="button">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{triggerLabels[t.trigger] || t.trigger}</Badge>
                    {!t.active && <Badge variant="outline" className="text-muted-foreground">מושבת</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {t.recipient_type === "custom" ? `📞 ${t.recipient_phone}` : "👤 טלפון הלקוח"}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{t.template_text}</p>
                  {(() => {
                    const len = t.template_text?.length || 0;
                    const smsCount = len <= 267 ? 1 : len <= 536 ? 2 : Math.ceil(len / 267);
                    return len > 0 ? (
                      <p className={`text-xs mt-1 ${smsCount > 1 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {len} תווים · {smsCount === 1 ? "הודעה אחת" : `${smsCount} הודעות`}
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch
                    checked={t.active}
                    onCheckedChange={(active) => toggleMutation.mutate({ id: t.id, active })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SmsComposer from "./SmsComposer";
import { useMarketingSmsTemplates, useSendSingleSms } from "@/hooks/useMarketingSms";
import { applySmsVars, countSmsChars, SMS_MAX_CHARS } from "@/lib/sms-text";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone?: string | null;
  customerName?: string | null;
  customerId?: string | null;
  orderNumber?: number | string | null;
}

const SendSmsDialog = ({ open, onOpenChange, phone, customerName, customerId, orderNumber }: Props) => {
  const { data: templates } = useMarketingSmsTemplates();
  const send = useSendSingleSms();
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const finalText = applySmsVars(text, { customer_name: customerName, phone, order_number: orderNumber });
  const tooLong = countSmsChars(finalText) > SMS_MAX_CHARS;

  const handleSend = () => {
    if (!phone) {
      toast.error("ללקוח אין מספר טלפון");
      return;
    }
    if (!finalText.trim() || tooLong) return;
    send.mutate(
      { phone, message: finalText, context: { customer_id: customerId || null, customer_name: customerName || null } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            שליחת SMS {customerName ? `— ${customerName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            נמען: <span dir="ltr">{phone || "אין מספר טלפון"}</span>
          </div>

          {!!templates?.length && (
            <div className="space-y-1">
              <Label>תבנית שמורה</Label>
              <Select onValueChange={(v) => setText(templates.find((t) => t.id === v)?.body || "")}>
                <SelectTrigger><SelectValue placeholder="בחר תבנית (אופציונלי)" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>תוכן ההודעה</Label>
            <SmsComposer value={text} onChange={setText} />
            <p className="text-xs text-muted-foreground">
              משתנים: {"{customer_name}"} · {"{phone}"} {orderNumber ? `· {order_number}` : ""}
            </p>
          </div>

          {text.includes("{") && (
            <div className="rounded-md border bg-muted/40 p-2 text-sm whitespace-pre-wrap">{finalText}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSend} disabled={!phone || !finalText.trim() || tooLong || send.isPending}>
            {send.isPending ? "שולח..." : "שלח"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendSmsDialog;
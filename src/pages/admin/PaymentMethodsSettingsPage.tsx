import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Banknote } from "lucide-react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { toast } from "sonner";

const DEFAULT_SETTINGS = {
  cash: { enabled: true, label: "الدفع عند الاستلام" },
  credit: { enabled: true, label: "بطاقة ائتمان" },
};

export default function PaymentMethodsSettingsPage() {
  const { data: existing, isLoading } = useSiteSection("settings", "payment_methods");
  const upsert = useUpsertSiteContent();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (existing?.content) {
      const c = existing.content as typeof DEFAULT_SETTINGS;
      setSettings({
        cash: { ...DEFAULT_SETTINGS.cash, ...c.cash },
        credit: { ...DEFAULT_SETTINGS.credit, ...c.credit },
      });
    }
  }, [existing]);

  const handleSave = () => {
    upsert.mutate({ page: "settings", section: "payment_methods", content: settings });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <h1 className="text-2xl font-bold">אמצעי תשלום באתר</h1>
      <p className="text-muted-foreground text-sm">בחר אילו אמצעי תשלום יהיו זמינים ללקוחות בדף הצ'קאאוט.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5 text-primary" />
            מזומן בעת מסירה
          </CardTitle>
          <CardDescription>הלקוח משלם במזומן כשהמשלוח מגיע</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="cash-enabled"
              checked={settings.cash.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, cash: { ...s.cash, enabled: v } }))}
            />
            <Label htmlFor="cash-enabled">{settings.cash.enabled ? "מופעל" : "כבוי"}</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            כרטיס אשראי (HYP)
          </CardTitle>
          <CardDescription>תשלום מאובטח בכרטיס אשראי דרך HYP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="credit-enabled"
              checked={settings.credit.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, credit: { ...s.credit, enabled: v } }))}
            />
            <Label htmlFor="credit-enabled">{settings.credit.enabled ? "מופעל" : "כבוי"}</Label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={upsert.isPending}>
        {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
        שמור הגדרות
      </Button>
    </div>
  );
}

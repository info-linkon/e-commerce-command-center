import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { toast } from "sonner";

const HypSettingsPage = () => {
  const { data: hypConfig, isLoading } = useSiteSection("settings", "hyp");
  const upsert = useUpsertSiteContent();

  const [masof, setMasof] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [passP, setPassP] = useState("");
  const [showPassP, setShowPassP] = useState(false);

  useEffect(() => {
    if (hypConfig?.content) {
      const c = hypConfig.content as Record<string, string>;
      setMasof(c.masof || "");
      setApiKey(c.api_key || "");
      setPassP(c.passp || "");
    }
  }, [hypConfig]);

  const handleSave = () => {
    if (!masof || !apiKey || !passP) {
      toast.error("יש למלא את כל השדות");
      return;
    }
    upsert.mutate({
      page: "settings",
      section: "hyp",
      content: {
        masof,
        api_key: apiKey,
        passp: passP,
      },
    });
  };

  const isConfigured = !!(hypConfig?.content as Record<string, string>)?.masof;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        הגדרות סליקה — HYP Pay
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            {isConfigured ? "הסליקה מוגדרת" : "הסליקה לא מוגדרת"}
          </CardTitle>
          <CardDescription>
            הזן את פרטי חשבון HYP Pay לתשלומי אשראי באתר. ניתן למצוא את הפרטים בהגדרות → הגדרות מסוף בפורטל HYP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מספר מסוף (Masof)</Label>
              <Input
                value={masof}
                onChange={(e) => setMasof(e.target.value)}
                placeholder="לדוגמה: 0010131918"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">10 ספרות — ניתן למצוא בהגדרות מסוף</p>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="מפתח API מדף ההגדרות"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">מופיע בהגדרות → הגדרות מסוף</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>PassP (סיסמת אימות)</Label>
              <div className="relative max-w-md">
                <Input
                  type={showPassP ? "text" : "password"}
                  value={passP}
                  onChange={(e) => setPassP(e.target.value)}
                  placeholder="סיסמת PassP"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassP(!showPassP)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassP ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">נוצר אוטומטית בפורטל HYP — לא ניתן לעריכה ידנית</p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "שומר..." : "שמור הגדרות"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">כתובות להגדרה בפורטל HYP</CardTitle>
          <CardDescription>
            יש להעתיק את הכתובות הבאות ולהזין אותן בהגדרות המסוף בפורטל HYP (הגדרות → דף הצלחה / כישלון).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>דף הצלחה (Success URL)</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/web/order-confirmation/{order_number}`}
                dir="ltr"
                className="font-mono text-sm bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/web/order-confirmation/`);
                  toast.success("הועתק!");
                }}
              >
                העתק
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              HYP יפנה לכתובת זו לאחר תשלום מוצלח. מספר ההזמנה יתווסף אוטומטית.
            </p>
          </div>
          <div className="space-y-2">
            <Label>דף כישלון (Error URL)</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/web/checkout?payment_error=true`}
                dir="ltr"
                className="font-mono text-sm bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/web/checkout?payment_error=true`);
                  toast.success("הועתק!");
                }}
              >
                העתק
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              HYP יפנה לכתובת זו אם התשלום נכשל או בוטל.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HypSettingsPage;

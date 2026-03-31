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

  const [terminalNumber, setTerminalNumber] = useState("");
  const [apiUrl, setApiUrl] = useState("https://meshulam.creditguard.co.il");
  const [hypUser, setHypUser] = useState("");
  const [hypPassword, setHypPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (hypConfig?.content) {
      const c = hypConfig.content as Record<string, string>;
      setTerminalNumber(c.terminal_number || "");
      setApiUrl(c.api_url || "https://meshulam.creditguard.co.il");
      setHypUser(c.user || "");
      setHypPassword(c.password || "");
    }
  }, [hypConfig]);

  const handleSave = () => {
    if (!terminalNumber || !apiUrl || !hypUser || !hypPassword) {
      toast.error("יש למלא את כל השדות");
      return;
    }
    upsert.mutate({
      page: "settings",
      section: "hyp",
      content: {
        terminal_number: terminalNumber,
        api_url: apiUrl,
        user: hypUser,
        password: hypPassword,
      },
    });
  };

  const isConfigured = !!(hypConfig?.content as Record<string, string>)?.terminal_number;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        הגדרות סליקה — HYP
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
            הזן את פרטי חשבון HYP CreditGuard לתשלומי אשראי באתר
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מספר טרמינל</Label>
              <Input
                value={terminalNumber}
                onChange={(e) => setTerminalNumber(e.target.value)}
                placeholder="לדוגמה: 0962XXX"
              />
            </div>
            <div className="space-y-2">
              <Label>כתובת API</Label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://meshulam.creditguard.co.il"
              />
            </div>
            <div className="space-y-2">
              <Label>שם משתמש</Label>
              <Input
                value={hypUser}
                onChange={(e) => setHypUser(e.target.value)}
                placeholder="שם המשתמש ב-HYP"
              />
            </div>
            <div className="space-y-2">
              <Label>סיסמה</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={hypPassword}
                  onChange={(e) => setHypPassword(e.target.value)}
                  placeholder="סיסמת HYP"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "שומר..." : "שמור הגדרות"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HypSettingsPage;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Eye, EyeOff, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const InforuSettingsPage = () => {
  const { data: inforuConfig, isLoading } = useSiteSection("settings", "inforu");
  const upsert = useUpsertSiteContent();

  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [sender, setSender] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (inforuConfig?.content) {
      const c = inforuConfig.content as Record<string, string>;
      setUsername(c.username || "");
      setToken(c.token || "");
      setSender(c.sender || "");
    }
  }, [inforuConfig]);

  const handleSave = () => {
    if (!username || !token) {
      toast.error("יש למלא שם משתמש וטוקן");
      return;
    }
    upsert.mutate({
      page: "settings",
      section: "inforu",
      content: {
        username,
        token,
        sender: sender || "ELWEJHA",
      },
    });
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error("יש להזין מספר טלפון לבדיקה");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: testPhone, message: "הודעת בדיקה מהמערכת ✓" },
      });
      if (error) throw error;
      const result = data?.result || "";
      if (result.includes("Status>1<") || result.includes("Status>1&")) {
        toast.success("הודעת בדיקה נשלחה בהצלחה!");
      } else {
        toast.error("שגיאה בשליחה: " + result);
      }
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const isConfigured = !!(inforuConfig?.content as Record<string, string>)?.username;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        הגדרות InforU SMS
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            פרטי חשבון InforU
          </CardTitle>
          <CardDescription>
            הזן את פרטי החשבון מממשק הניהול של InforUMobile.
            הטוקן נמצא תחת פרטי חשבון &gt; API Tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">שם משתמש (Username)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="שם משתמש InforU"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="הטוקן מפרטי החשבון"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender">שם שולח (Sender Name)</Label>
            <Input
              id="sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="ELWEJHA"
            />
            <p className="text-xs text-muted-foreground">עד 11 תווים באנגלית, או מספר טלפון</p>
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "שומר..." : "שמור הגדרות"}
          </Button>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            שליחת הודעת בדיקה
          </CardTitle>
          <CardDescription>בדוק שההגדרות עובדות ע״י שליחת הודעת בדיקה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="מספר טלפון לבדיקה"
              dir="ltr"
            />
            <Button onClick={handleTestSms} disabled={sending}>
              {sending ? "שולח..." : "שלח בדיקה"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InforuSettingsPage;

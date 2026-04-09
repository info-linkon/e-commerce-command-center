import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";

const EzcountSettingsPage = () => {
  const { data: ezConfig, isLoading } = useSiteSection("settings", "ezcount");
  const upsert = useUpsertSiteContent();

  const [apiKey, setApiKey] = useState("");
  const [developerEmail, setDeveloperEmail] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (ezConfig?.content) {
      const c = ezConfig.content as Record<string, string>;
      setApiKey(c.api_key || "");
      setDeveloperEmail(c.developer_email || "");
    }
  }, [ezConfig]);

  const handleSave = () => {
    if (!apiKey || !developerEmail) {
      return;
    }
    upsert.mutate({
      page: "settings",
      section: "ezcount",
      content: { api_key: apiKey, developer_email: developerEmail },
    });
  };

  const isConfigured = !!(ezConfig?.content as Record<string, string>)?.api_key;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">טוען...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileText className="h-6 w-6" />
        הגדרות EZCount
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            פרטי חשבון EZCount
          </CardTitle>
          <CardDescription>
            הזן את ה-API Key ומייל המפתח מחשבון EZCount שלך.
            ניתן למצוא את ה-API Key בהגדרות החשבון באתר ezcount.co.il.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key</Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="הזן API Key"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="developer_email">מייל מפתח (Developer Email)</Label>
            <Input
              id="developer_email"
              type="email"
              value={developerEmail}
              onChange={(e) => setDeveloperEmail(e.target.value)}
              placeholder="example@domain.com"
              dir="ltr"
            />
          </div>

          <Button onClick={handleSave} disabled={upsert.isPending || !apiKey || !developerEmail}>
            {upsert.isPending ? "שומר..." : "שמור הגדרות"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EzcountSettingsPage;

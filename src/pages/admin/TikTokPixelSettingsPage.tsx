import { useState, useEffect } from "react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3 } from "lucide-react";

export default function TikTokPixelSettingsPage() {
  const { data: settings } = useSiteSection("settings", "tiktok_pixel");
  const upsert = useUpsertSiteContent();
  const [pixelId, setPixelId] = useState("");

  useEffect(() => {
    if (settings?.content) {
      setPixelId((settings.content as any).pixel_id || "");
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate({
      page: "settings",
      section: "tiktok_pixel",
      content: { pixel_id: pixelId.trim() },
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        הגדרות TikTok Pixel
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Pixel ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>TikTok Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="D95OKQJC77UCQSPIQSFG"
              dir="ltr"
              className="mt-1 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ניתן למצוא את ה-Pixel ID ב-TikTok Events Manager
            </p>
          </div>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "שומר..." : "שמור"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>אירועים שנשלחים אוטומטית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
            <ul className="list-disc list-inside space-y-0.5">
              <li>Pageview — בכל טעינת דף באתר</li>
              <li>ViewContent — בדף מוצר</li>
              <li>AddToCart — בהוספה לסל</li>
              <li>InitiateCheckout — בכניסה לצ'קאאוט</li>
              <li>CompletePayment — לאחר סיום הזמנה (מקביל ל-Purchase של Meta)</li>
            </ul>
            <p className="mt-2">
              האירועים נשלחים במקביל ל-Meta Pixel ול-GA4 — לא נדרש שינוי במעקב הקיים.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
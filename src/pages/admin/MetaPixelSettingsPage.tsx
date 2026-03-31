import { useState, useEffect } from "react";
import { useSiteSection, useUpsertSiteContent } from "@/hooks/useSiteContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function MetaPixelSettingsPage() {
  const { data: settings, isLoading } = useSiteSection("settings", "meta_pixel");
  const upsert = useUpsertSiteContent();
  const [pixelId, setPixelId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings?.content) {
      setPixelId((settings.content as any).pixel_id || "");
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate({
      page: "settings",
      section: "meta_pixel",
      content: { pixel_id: pixelId },
    });
  };

  const feedUrl = `https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/meta-product-feed`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success("הקישור הועתק");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        הגדרות Meta Pixel
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Pixel ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Meta Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="123456789012345"
              dir="ltr"
              className="mt-1 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ניתן למצוא את ה-Pixel ID ב-Meta Events Manager
            </p>
          </div>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "שומר..." : "שמור"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>XML Product Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            השתמש בקישור הזה כ-Data Feed ב-Meta Business Manager כדי לסנכרן את קטלוג המוצרים.
          </p>
          <div className="flex gap-2">
            <Input value={feedUrl} readOnly dir="ltr" className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground space-y-1">
            <p><strong>אירועי Pixel שמופעלים אוטומטית:</strong></p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>PageView — בכל טעינת דף באתר</li>
              <li>ViewContent — בדף מוצר</li>
              <li>AddToCart — בהוספה לסל</li>
              <li>InitiateCheckout — בכניסה לצ'קאאוט</li>
              <li>Purchase — לאחר סיום הזמנה</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

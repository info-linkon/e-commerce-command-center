import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ServerCog, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSection } from "@/hooks/useSiteContent";

type SecretKey = "ga4_api_secret" | "ga4_measurement_id" | "meta_capi_access_token" | "tiktok_events_access_token";
type SecretStatus = Record<SecretKey, { set: boolean; hint: string | null; source: "crm" | "env" | null }>;

async function callSecrets(body: Record<string, unknown>): Promise<SecretStatus> {
  const { data, error } = await supabase.functions.invoke("tracking-secrets", { body });
  if (error) {
    // supabase-js hides the JSON error body behind a generic message.
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json())?.error || msg;
    } catch {
      // keep generic message
    }
    throw new Error(msg);
  }
  if (!data?.success) throw new Error(data?.error || "שגיאה לא ידועה");
  return data.status as SecretStatus;
}

function StatusBadge({ s }: { s?: { set: boolean; hint: string | null } }) {
  if (!s) return null;
  return s.set ? (
    <Badge className="bg-green-600 hover:bg-green-600">מוגדר {s.hint && <span className="mr-1 font-mono" dir="ltr">{s.hint}</span>}</Badge>
  ) : (
    <Badge variant="outline">לא מוגדר</Badge>
  );
}

function SecretField({
  id, label, placeholder, status, value, onChange, onClear,
}: {
  id: SecretKey; label: string; placeholder: string;
  status?: { set: boolean; hint: string | null; source: "crm" | "env" | null };
  value: string; onChange: (v: string) => void; onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Label htmlFor={id}>{label}</Label>
        <StatusBadge s={status} />
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          type="password"
          autoComplete="off"
          dir="ltr"
          placeholder={status?.set ? "השאר ריק כדי לא לשנות" : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {status?.set && status.source === "crm" && (
          <Button type="button" variant="outline" onClick={onClear}>מחק</Button>
        )}
      </div>
    </div>
  );
}

const Steps = ({ children }: { children: React.ReactNode }) => (
  <ol className="list-decimal pr-5 space-y-1 text-sm text-muted-foreground">{children}</ol>
);

export default function ConversionsApiSettingsPage() {
  const qc = useQueryClient();
  const { data: metaPixel } = useSiteSection("settings", "meta_pixel");
  const { data: tiktokPixel } = useSiteSection("settings", "tiktok_pixel");
  const metaPixelId = (metaPixel?.content as { pixel_id?: string } | null)?.pixel_id || "";
  const tiktokPixelId = (tiktokPixel?.content as { pixel_id?: string } | null)?.pixel_id || "";

  const [values, setValues] = useState<Partial<Record<SecretKey, string>>>({});
  const set = (k: SecretKey) => (v: string) => setValues((s) => ({ ...s, [k]: v }));

  const statusQuery = useQuery({
    queryKey: ["tracking-secrets-status"],
    queryFn: () => callSecrets({ action: "status" }),
    retry: false,
  });
  const status = statusQuery.data;

  // Recent server-side purchase sends (written by _shared/server-conversions.ts).
  const { data: recent } = useQuery({
    queryKey: ["server-conversion-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_events")
        .select("created_at, success, message, orders(order_number)")
        .eq("event_type", "server_conversion")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: (payload: Partial<Record<SecretKey, string | null>>) => callSecrets({ action: "save", values: payload }),
    onSuccess: (s) => {
      qc.setQueryData(["tracking-secrets-status"], s);
      setValues({});
      toast.success("נשמר");
    },
    onError: (e: Error) => toast.error(`השמירה נכשלה: ${e.message}`),
  });

  const handleSave = () => {
    const payload: Partial<Record<SecretKey, string>> = {};
    for (const [k, v] of Object.entries(values)) if (v && v.trim()) payload[k as SecretKey] = v.trim();
    if (!Object.keys(payload).length) {
      toast.info("לא הוזן ערך חדש");
      return;
    }
    save.mutate(payload);
  };
  const clear = (k: SecretKey) => {
    if (confirm("למחוק את הערך השמור?")) save.mutate({ [k]: null });
  };

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ServerCog className="h-6 w-6" />
        חיבור שרת לפרסום (Conversions API)
      </h1>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-2 text-sm">
          <p>
            הפיקסלים בדפדפן מפספסים חלק מהרכישות (חוסמי פרסומות, דפדפן של אינסטגרם/טיקטוק, לקוח שסגר את הדף לפני עמוד התודה).
            כאן מגדירים את המפתחות שמאפשרים למערכת לדווח על כל רכישה <b>ישירות מהשרת</b> ל-Google, Meta ו-TikTok — בנוסף לפיקסל, בלי ספירה כפולה.
          </p>
          <p className="flex items-center gap-1 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            המפתחות נשמרים במקום פרטי שרק השרת ומנהלי המערכת יכולים לגשת אליו, ואינם מוצגים שוב אחרי השמירה (רק 4 התווים האחרונים).
            כל פלטפורמה שלא הוגדר לה מפתח פשוט מדולגת.
          </p>
        </CardContent>
      </Card>

      {statusQuery.isError && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            לא ניתן לטעון את ההגדרות: {(statusQuery.error as Error).message}.
            אם השגיאה היא "Failed to send a request" — פונקציית השרת <span dir="ltr">tracking-secrets</span> עדיין לא נפרסה.
          </CardContent>
        </Card>
      )}

      {/* Google Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Google Analytics 4</CardTitle>
          <CardDescription>Measurement Protocol API secret</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Steps>
            <li>
              היכנס ל-
              <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Google Analytics <ExternalLink className="h-3 w-3" />
              </a>
              {" "}עם משתמש בעל הרשאת Editor/Administrator לנכס של elwejha.
            </li>
            <li>לחץ על <b>Admin</b> (גלגל השיניים למטה משמאל).</li>
            <li>תחת <b>Data collection and modification</b> בחר <b>Data streams</b>, ואז את זרם האתר של elwejha.co.il.</li>
            <li>ודא שה-<b>Measurement ID</b> שמופיע למעלה הוא <span dir="ltr" className="font-mono">G-M0ST7YDS0C</span> (אם שונה — הזן אותו בשדה למטה).</li>
            <li>גלול ל-<b>Measurement Protocol API secrets</b> ← <b>Create</b>, תן שם (למשל "elwejha server") ← <b>Create</b>.</li>
            <li>העתק את הערך בעמודה <b>Secret value</b> והדבק כאן.</li>
          </Steps>
          <SecretField id="ga4_api_secret" label="API secret" placeholder="הדבק כאן את ה-Secret value"
            status={status?.ga4_api_secret} value={values.ga4_api_secret || ""} onChange={set("ga4_api_secret")} onClear={() => clear("ga4_api_secret")} />
          <SecretField id="ga4_measurement_id" label="Measurement ID (רשות — ברירת מחדל G-M0ST7YDS0C)" placeholder="G-M0ST7YDS0C"
            status={status?.ga4_measurement_id} value={values.ga4_measurement_id || ""} onChange={set("ga4_measurement_id")} onClear={() => clear("ga4_measurement_id")} />
        </CardContent>
      </Card>

      {/* Meta */}
      <Card>
        <CardHeader>
          <CardTitle>Meta (Facebook / Instagram)</CardTitle>
          <CardDescription>
            Conversions API access token · פיקסל: <span dir="ltr" className="font-mono">{metaPixelId || "לא הוגדר — הגדר קודם ב-Meta Pixel"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Steps>
            <li>
              היכנס ל-
              <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                Meta Events Manager <ExternalLink className="h-3 w-3" />
              </a>
              {" "}עם משתמש שהוא מנהל (Admin) של הפיקסל.
            </li>
            <li>בחר מהרשימה את הפיקסל <span dir="ltr" className="font-mono">{metaPixelId || "של האתר"}</span>.</li>
            <li>עבור ללשונית <b>Settings</b> (הגדרות).</li>
            <li>גלול לחלק <b>Conversions API</b> ← תחת "Set up manually" לחץ <b>Generate access token</b>.</li>
            <li>העתק את הטוקן (מחרוזת ארוכה) והדבק כאן. Meta מציגה אותו פעם אחת בלבד.</li>
          </Steps>
          <SecretField id="meta_capi_access_token" label="Access token" placeholder="EAA…"
            status={status?.meta_capi_access_token} value={values.meta_capi_access_token || ""} onChange={set("meta_capi_access_token")} onClear={() => clear("meta_capi_access_token")} />
        </CardContent>
      </Card>

      {/* TikTok */}
      <Card>
        <CardHeader>
          <CardTitle>TikTok</CardTitle>
          <CardDescription>
            Events API access token · פיקסל: <span dir="ltr" className="font-mono">{tiktokPixelId || "לא הוגדר — הגדר קודם ב-TikTok Pixel"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Steps>
            <li>
              היכנס ל-
              <a href="https://ads.tiktok.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                TikTok Ads Manager <ExternalLink className="h-3 w-3" />
              </a>.
            </li>
            <li>בתפריט העליון: <b>Tools</b> ← <b>Events</b> ← <b>Web Events</b> (Manage).</li>
            <li>בחר את הפיקסל <span dir="ltr" className="font-mono">{tiktokPixelId || "של האתר"}</span> ועבור ללשונית <b>Settings</b>.</li>
            <li>בחלק <b>Events API</b> לחץ <b>Generate Access Token</b>.</li>
            <li>העתק את הטוקן והדבק כאן.</li>
          </Steps>
          <SecretField id="tiktok_events_access_token" label="Access token" placeholder="הדבק כאן את הטוקן"
            status={status?.tiktok_events_access_token} value={values.tiktok_events_access_token || ""} onChange={set("tiktok_events_access_token")} onClear={() => clear("tiktok_events_access_token")} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={save.isPending || statusQuery.isLoading}>
        {save.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
        שמור מפתחות
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>דיווחים אחרונים מהשרת</CardTitle>
          <CardDescription>
            אחרי השמירה, כל הזמנה חדשה מהאתר (מזומן מיד, אשראי אחרי אישור Hyp) תופיע כאן עם הפלטפורמות שקיבלו אותה.
            "skipped" = אין מפתח לאותה פלטפורמה; "failed" = המפתח שגוי או חסרות הרשאות.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">זמן</TableHead>
                <TableHead className="text-right">הזמנה</TableHead>
                <TableHead className="text-right">תוצאה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recent || []).map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("he-IL")}</TableCell>
                  <TableCell>#{(r.orders as { order_number?: number } | null)?.order_number ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono" dir="ltr">
                    <Badge variant={r.success ? "default" : "outline"} className="ml-2">{r.success ? "OK" : "!"}</Badge>
                    {r.message}
                  </TableCell>
                </TableRow>
              ))}
              {(!recent || recent.length === 0) && (
                <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">עדיין אין דיווחים</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

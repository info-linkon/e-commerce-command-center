import { useState } from "react";
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SyncAction = "import_categories" | "import_products" | "export_products" | "import_orders" | "import_images";

interface SyncResult {
  action: SyncAction;
  success: boolean;
  count?: number;
  error?: string;
  timestamp: Date;
}

interface ImageProgress {
  processed: number;
  total: number;
  imported: number;
  skipped: number;
}

const syncActions: { action: SyncAction; title: string; description: string; icon: typeof Download; direction: "import" | "export" }[] = [
  { action: "import_categories", title: "ייבוא קטגוריות", description: "ייבוא קטגוריות מ-WooCommerce למערכת", icon: Download, direction: "import" },
  { action: "import_products", title: "ייבוא מוצרים", description: "ייבוא מוצרים ווריאציות מ-WooCommerce", icon: Download, direction: "import" },
  { action: "import_images", title: "משיכת תמונות", description: "הורדת תמונות ראשיות + גלריה מווקומרס ושמירה מקומית", icon: Image, direction: "import" },
  { action: "export_products", title: "ייצוא מוצרים", description: "ייצוא מוצרים מפורסמים ל-WooCommerce", icon: Upload, direction: "export" },
  { action: "import_orders", title: "ייבוא הזמנות", description: "ייבוא הזמנות אחרונות מ-WooCommerce", icon: Download, direction: "import" },
];

const WooSyncPage = () => {
  const [loading, setLoading] = useState<SyncAction | null>(null);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [imageProgress, setImageProgress] = useState<ImageProgress | null>(null);

  const runImageSync = async (forceRefresh = false) => {
    setLoading("import_images");
    let offset = 0;
    const limit = 5;
    let totalImported = 0;
    let totalSkipped = 0;

    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke("woo-sync", {
          body: { action: "import_images", offset, limit, forceRefresh },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        totalImported += data.imported || 0;
        totalSkipped += data.skipped || 0;

        setImageProgress({
          processed: data.processed,
          total: data.total,
          imported: totalImported,
          skipped: totalSkipped,
        });

        if (!data.hasMore) break;
        offset = data.nextOffset;
      }

      setResults((prev) => [{ action: "import_images", success: true, count: totalImported, timestamp: new Date() }, ...prev]);
      toast.success(`משיכת תמונות הושלמה: ${totalImported} יובאו, ${totalSkipped} דולגו`);
    } catch (e: any) {
      setResults((prev) => [{ action: "import_images", success: false, error: e.message, timestamp: new Date() }, ...prev]);
      toast.error(`שגיאה: ${e.message}`);
    } finally {
      setLoading(null);
      setTimeout(() => setImageProgress(null), 3000);
    }
  };

  const runSync = async (action: SyncAction) => {
    if (action === "import_images") {
      return runImageSync();
    }

    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("woo-sync", {
        body: { action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const count = data?.imported || data?.exported || 0;
      setResults((prev) => [{ action, success: true, count, timestamp: new Date() }, ...prev]);
      toast.success(`${action.includes("import") ? "ייבוא" : "ייצוא"} הושלם: ${count} פריטים`);
    } catch (e: any) {
      setResults((prev) => [{ action, success: false, error: e.message, timestamp: new Date() }, ...prev]);
      toast.error(`שגיאה: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const progressPercent = imageProgress ? Math.round((imageProgress.processed / imageProgress.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6" />
        <h1 className="text-2xl font-bold">סנכרון WooCommerce</h1>
      </div>

      {/* Image sync progress */}
      {imageProgress && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">מעבד תמונות מוצרים...</span>
              <span className="text-muted-foreground">
                {imageProgress.processed} / {imageProgress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>יובאו: {imageProgress.imported}</span>
              <span>דולגו: {imageProgress.skipped}</span>
              <span>{progressPercent}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {syncActions.map(({ action, title, description, icon: Icon, direction }) => (
          <Card key={action}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runSync(action)}
                disabled={loading !== null}
                variant={direction === "export" ? "outline" : "default"}
                className="w-full"
              >
                {loading === action ? (
                  <><Loader2 className="h-4 w-4 animate-spin ml-2" />מסנכרן...</>
                ) : (
                  direction === "import" ? "ייבוא" : "ייצוא"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>היסטוריית סנכרון</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{syncActions.find((a) => a.action === r.action)?.title}</span>
                    {r.success && <Badge variant="secondary">{r.count} פריטים</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    {r.error && <span className="text-destructive">{r.error}</span>}
                    <span>{r.timestamp.toLocaleTimeString("he-IL")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WooSyncPage;

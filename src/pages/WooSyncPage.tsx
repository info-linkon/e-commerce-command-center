import { useState } from "react";
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SyncAction = "import_categories" | "import_products" | "export_products" | "import_orders";

interface SyncResult {
  action: SyncAction;
  success: boolean;
  count?: number;
  error?: string;
  timestamp: Date;
}

const syncActions: { action: SyncAction; title: string; description: string; icon: typeof Download; direction: "import" | "export" }[] = [
  { action: "import_categories", title: "ייבוא קטגוריות", description: "ייבוא קטגוריות מ-WooCommerce למערכת", icon: Download, direction: "import" },
  { action: "import_products", title: "ייבוא מוצרים", description: "ייבוא מוצרים ווריאציות מ-WooCommerce", icon: Download, direction: "import" },
  { action: "export_products", title: "ייצוא מוצרים", description: "ייצוא מוצרים מפורסמים ל-WooCommerce", icon: Upload, direction: "export" },
  { action: "import_orders", title: "ייבוא הזמנות", description: "ייבוא הזמנות אחרונות מ-WooCommerce", icon: Download, direction: "import" },
];

const WooSyncPage = () => {
  const [loading, setLoading] = useState<SyncAction | null>(null);
  const [results, setResults] = useState<SyncResult[]>([]);

  const runSync = async (action: SyncAction) => {
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

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6" />
        <h1 className="text-2xl font-bold">סנכרון WooCommerce</h1>
      </div>

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

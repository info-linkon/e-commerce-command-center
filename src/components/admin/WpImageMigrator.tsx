import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MigrateResult {
  migrated: number;
  failed: number;
  migratedList: string[];
  failedList: string[];
}

export default function WpImageMigrator() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-wp-images");
      if (error) throw error;
      setResult(data as MigrateResult);
      if (data.failed === 0) {
        toast.success(`הועברו ${data.migrated} תמונות בהצלחה!`);
      } else {
        toast.warning(`הועברו ${data.migrated}, נכשלו ${data.failed}`);
      }
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעברת תמונות");
    }
    setRunning(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5 text-primary" />
          העברת תמונות מ-WordPress
        </CardTitle>
        <CardDescription>
          מוריד תמונות שעדיין מאוחסנות ב-WordPress ומעלה אותן ל-Supabase Storage. לאחר מכן ניתן להמיר ל-WebP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={running} variant="outline" size="sm">
          {running ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Globe className="h-4 w-4 ml-1" />}
          {running ? "מעביר תמונות..." : "התחל העברה"}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {result.migrated > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 ml-1" /> {result.migrated} הועברו
                </Badge>
              )}
              {result.failed > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 ml-1" /> {result.failed} נכשלו
                </Badge>
              )}
              {result.migrated === 0 && result.failed === 0 && (
                <Badge variant="secondary">אין תמונות להעברה</Badge>
              )}
            </div>

            {result.failedList.length > 0 && (
              <div className="border border-destructive/30 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {result.failedList.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

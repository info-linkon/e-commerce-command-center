import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX } from "lucide-react";

const InvoiceRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }

    const fetchAndRedirect = async () => {
      const { data, error: dbErr } = await supabase
        .from("documents" as any)
        .select("doc_url")
        .eq("short_code", code)
        .eq("status", "issued")
        .maybeSingle();

      if (dbErr || !data?.doc_url) {
        setError(true);
        return;
      }
      window.location.replace(data.doc_url);
    };

    fetchAndRedirect();
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground" dir="rtl">
        <FileX className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold">מסמך לא נמצא</h1>
        <p className="text-muted-foreground">הקישור אינו תקין או שהמסמך אינו זמין.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">מעביר למסמך...</p>
    </div>
  );
};

export default InvoiceRedirect;

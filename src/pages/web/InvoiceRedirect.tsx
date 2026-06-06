import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileX, Clock } from "lucide-react";

const InvoiceRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<null | "not_found" | "pending" | "failed">(null);

  useEffect(() => {
    if (!code) { setError("not_found"); return; }

    const fetchAndRedirect = async () => {
      const { data, error: dbErr } = await supabase
        .from("documents" as any)
        .select("doc_url, status")
        .eq("short_code", code)
        .maybeSingle() as any;

      if (dbErr || !data) {
        setError("not_found");
        return;
      }
      if (!data.doc_url) {
        setError(data.status === "failed" ? "failed" : "pending");
        return;
      }
      window.location.replace(data.doc_url);
    };

    fetchAndRedirect();
  }, [code]);

  if (error) {
    const msg = error === "pending"
      ? { icon: Clock, title: "המסמך עדיין בהפקה", desc: "נסה שוב בעוד דקה." }
      : error === "failed"
      ? { icon: FileX, title: "הפקת המסמך נכשלה", desc: "פנה לתמיכה לבדיקה." }
      : { icon: FileX, title: "מסמך לא נמצא", desc: "הקישור אינו תקין או שהמסמך אינו זמין." };
    const Icon = msg.icon;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground" dir="rtl">
        <Icon className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-bold">{msg.title}</h1>
        <p className="text-muted-foreground">{msg.desc}</p>
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

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = "https://gboskpvfvwrsiqwzpctk.supabase.co";

const InvoiceRedirect = () => {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (!code) return;
    window.location.replace(
      `${SUPABASE_URL}/functions/v1/inv-redirect?code=${encodeURIComponent(code)}`,
    );
  }, [code]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">מעביר למסמך...</p>
    </div>
  );
};

export default InvoiceRedirect;

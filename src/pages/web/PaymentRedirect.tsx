import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PaymentRedirect = () => {
  const { orderNumber } = useParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirect = async () => {
      if (!orderNumber) {
        setError("מספר הזמנה חסר");
        return;
      }

      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("payment_link_url")
        .eq("order_number", Number(orderNumber))
        .single();

      if (fetchError || !order) {
        setError("הזמנה לא נמצאה");
        return;
      }

      const paymentUrl = (order as any).payment_link_url;
      if (!paymentUrl) {
        setError("לינק תשלום לא זמין");
        return;
      }

      window.location.href = paymentUrl;
    };

    redirect();
  }, [orderNumber]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-2">
          <p className="text-lg text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center space-y-2">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">מעביר לדף תשלום...</p>
      </div>
    </div>
  );
};

export default PaymentRedirect;

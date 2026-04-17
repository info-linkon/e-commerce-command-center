import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "already_paid"; orderNumber: string };

const PaymentRedirect = () => {
  const { orderNumber } = useParams();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const redirect = async () => {
      if (!orderNumber) {
        setState({ kind: "error", message: "מספר הזמנה חסר" });
        return;
      }

      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("payment_link_url, status, hyp_transaction_id")
        .eq("order_number", Number(orderNumber))
        .single();

      if (fetchError || !order) {
        setState({ kind: "error", message: "הזמנה לא נמצאה" });
        return;
      }

      // Block forwarding to HYP if the order is already paid / closed.
      const blocked = new Set(["processing", "picking", "shipping", "completed"]);
      if (order.hyp_transaction_id || blocked.has(order.status as string)) {
        setState({ kind: "already_paid", orderNumber });
        return;
      }

      if (order.status === "cancelled") {
        setState({ kind: "error", message: "ההזמנה בוטלה" });
        return;
      }

      if (!order.payment_link_url) {
        setState({ kind: "error", message: "לינק תשלום לא זמין" });
        return;
      }

      window.location.href = order.payment_link_url;
    };

    redirect();
  }, [orderNumber]);

  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3 max-w-md px-4">
          <p className="text-lg text-destructive">{state.message}</p>
          <Link to="/" className="text-primary underline text-sm">חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  if (state.kind === "already_paid") {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-4 max-w-md px-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">ההזמנה כבר שולמה</h1>
          <p className="text-muted-foreground">
            הזמנה #{state.orderNumber} כבר שולמה. תודה על הרכישה!
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
          >
            חזרה לדף הבית
          </Link>
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

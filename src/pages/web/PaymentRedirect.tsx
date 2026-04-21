import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

// `/pay/:orderNumber` is the customer-facing shortlink we send by SMS.
//
// We can't read the `orders` row from the browser (anon has no SELECT on
// orders — PII protection), so we hand off to the `pay-redirect` edge
// function which runs with the service role and either:
//   • 302s to the signed HYP URL, or
//   • renders an "already paid" / "cancelled" / "no link" HTML page.
//
// This component just shows a brief spinner while the browser navigates to
// that endpoint.
const PROJECT_REF = "gboskpvfvwrsiqwzpctk";

const PaymentRedirect = () => {
  const { orderNumber } = useParams();

  useEffect(() => {
    if (!orderNumber) return;
    window.location.replace(
      `https://${PROJECT_REF}.supabase.co/functions/v1/pay-redirect?order=${encodeURIComponent(orderNumber)}`,
    );
  }, [orderNumber]);

  if (!orderNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3 max-w-md px-4">
          <p className="text-lg text-destructive">מספר הזמנה חסר</p>
          <Link to="/" className="text-primary underline text-sm">חזרה לדף הבית</Link>
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

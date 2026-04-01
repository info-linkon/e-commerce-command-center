import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";

export default function WebOrderConfirmation() {
  const { orderNumber: routeOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const orderNumber = routeOrderNumber || searchParams.get("Order");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);

  // If loaded inside iframe, redirect parent to this URL
  useEffect(() => {
    if (window.self !== window.top) {
      try {
        window.top!.location.href = window.location.href;
      } catch {
        // cross-origin — use postMessage fallback
        window.parent.postMessage({ type: "hyp-payment-done", url: window.location.href }, "*");
      }
      return;
    }
  }, []);

  useEffect(() => {
    const hypId = searchParams.get("Id");
    const ccode = searchParams.get("CCode");
    const paymentParam = searchParams.get("payment");

    if (paymentParam === "pending") {
      setPaymentPending(true);
      return;
    }

    // If we have HYP return params, verify the payment
    if (hypId && ccode !== null) {
      verifyPayment();
    } else {
      // No HYP params — just show confirmation
      setVerified(true);
    }

    // Meta Pixel: Purchase event
    const total = searchParams.get("Amount") || searchParams.get("total");
    if (total) {
      const ids = searchParams.get("ids");
      fbq("Purchase", {
        content_ids: ids ? ids.split(",") : [],
        value: parseFloat(total),
        currency: "ILS",
        content_type: "product",
      });
    }
  }, []);

  const verifyPayment = async () => {
    setVerifying(true);
    try {
      const orderId = sessionStorage.getItem("hyp_order_id");

      // Collect all HYP return params
      const hypParams: Record<string, string> = {};
      const paramNames = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign", "Bank", "Payments", "UserId", "Brand", "Issuer", "L4digit", "street", "city", "zip", "cell", "Coin", "Tmonth", "Tyear", "errMsg", "Hesh"];
      for (const name of paramNames) {
        const val = searchParams.get(name);
        if (val !== null) hypParams[name] = val;
      }

      const { data, error } = await supabase.functions.invoke("hyp-verify-payment", {
        body: {
          ...hypParams,
          order_id: orderId,
        },
      });

      if (error) {
        console.error("Verify error:", error);
        setVerified(false);
      } else if (data?.verified) {
        setVerified(true);
        sessionStorage.removeItem("hyp_order_id");
        sessionStorage.removeItem("hyp_order_number");

        // Fire Purchase pixel
        const amount = searchParams.get("Amount");
        if (amount) {
          fbq("Purchase", {
            value: parseFloat(amount),
            currency: "ILS",
            content_type: "product",
          });
        }
      } else {
        setVerified(false);
      }
    } catch (err) {
      console.error("Verify exception:", err);
      setVerified(false);
    }
    setVerifying(false);
  };

  if (verifying) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-bold text-foreground mb-3">מאמת את התשלום...</h1>
        <p className="text-muted-foreground">אנא המתן</p>
      </div>
    );
  }

  if (verified === false) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">שגיאה בתשלום</h1>
        <p className="text-muted-foreground mb-2">מספר הזמנה: <span className="font-bold text-primary">#{orderNumber}</span></p>
        <p className="text-muted-foreground mb-8">התשלום לא אומת. אם חויבת, נציג יצור איתך קשר.</p>
        <Link
          to="/web"
          className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-foreground mb-3">
        {paymentPending ? "تم استلام طلبك!" : "تم الدفع بنجاح!"}
      </h1>
      <p className="text-muted-foreground mb-2">رقم الطلب: <span className="font-bold text-gold">#{orderNumber}</span></p>
      <p className="text-muted-foreground mb-8">
        {paymentPending
          ? "سنتواصل معك قريباً لتأكيد الدفع"
          : "سنتواصل معك قريباً لتأكيد الطلب"}
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/web/track"
          className="px-6 py-3 border border-gold text-gold rounded-full font-medium hover:bg-gold/10 transition-colors"
        >
          تتبع الطلب
        </Link>
        <Link
          to="/web"
          className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

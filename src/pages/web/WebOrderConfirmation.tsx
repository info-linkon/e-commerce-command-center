import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/lib/web-cart-store";

export default function WebOrderConfirmation() {
  const { orderNumber: routeOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const orderNumber = routeOrderNumber || searchParams.get("Order");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("loading");

  const isIframe = window.self !== window.top;

  // If loaded inside iframe, redirect parent to this URL and do nothing else
  useEffect(() => {
    if (isIframe) {
      try {
        window.top!.location.href = window.location.href;
      } catch {
        window.parent.postMessage({ type: "hyp-payment-done", url: window.location.href }, "*");
      }
    }
  }, []);

  useEffect(() => {
    if (isIframe) return;

    const ccode = searchParams.get("CCode");
    const paymentParam = searchParams.get("payment");

    if (paymentParam === "pending") {
      setStatus("pending");
      clearCart();
      return;
    }

    // HYP redirect: CCode=0 means success, anything else is failure
    if (ccode !== null) {
      if (ccode === "0") {
        setStatus("success");
        clearCart();

        // Fire verify in background to update order status (fire-and-forget)
        const orderId = sessionStorage.getItem("hyp_order_id");
        if (orderId) {
          const hypParams: Record<string, string> = {};
          const paramNames = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign", "Bank", "Payments", "UserId", "Brand", "Issuer", "L4digit", "street", "city", "zip", "cell", "Coin", "Tmonth", "Tyear", "errMsg", "Hesh"];
          for (const name of paramNames) {
            const val = searchParams.get(name);
            if (val !== null) hypParams[name] = val;
          }
          supabase.functions.invoke("hyp-verify-payment", {
            body: { ...hypParams, order_id: orderId },
          }).then(() => {
            // Trigger SMS for new order after successful payment
            supabase.functions.invoke("order-sms-trigger", {
              body: { order_id: orderId, trigger_type: "order_created" },
            }).catch(console.error);
            sessionStorage.removeItem("hyp_order_id");
            sessionStorage.removeItem("hyp_order_number");
          }).catch((err) => console.error("Background verify error:", err));
        }

        // Meta Pixel
        const amount = searchParams.get("Amount");
        if (amount) {
          fbq("Purchase", {
            value: parseFloat(amount),
            currency: "ILS",
            content_type: "product",
          });
        }
      } else {
        setStatus("error");
      }
      return;
    }

    // No HYP params — cash order or direct visit
    setStatus("success");
    clearCart();

    const total = searchParams.get("total");
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

  if (status === "loading") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-bold text-foreground mb-3">جاري التحقق...</h1>
        <p className="text-muted-foreground">يرجى الانتظار</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">שגיאה בתשלום</h1>
        <p className="text-muted-foreground mb-2">מספר הזמנה: <span className="font-bold text-primary">#{orderNumber}</span></p>
        <p className="text-muted-foreground mb-8">התשלום לא הצליח. אם חויבת, נציג יצור איתך קשר.</p>
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
        {status === "pending" ? "تم استلام طلبك!" : "تم الدفع بنجاح!"}
      </h1>
      <p className="text-muted-foreground mb-2">رقم الطلب: <span className="font-bold text-gold">#{orderNumber}</span></p>
      <p className="text-muted-foreground mb-8">
        {status === "pending"
          ? "سنتواصل معك قريباً لتأكيد الدفع"
          : "سنتواصل معك قريباً لتأكيد الطلب"}
      </p>
      <div className="flex gap-4 justify-center">
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
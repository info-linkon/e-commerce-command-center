import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/lib/web-cart-store";
import { useLanguage } from "@/hooks/useLanguage";

export default function WebOrderConfirmation() {
  const { orderNumber: routeOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const { t } = useLanguage();
  const orderNumber = routeOrderNumber || searchParams.get("Order");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">("loading");

  const isIframe = window.self !== window.top;

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

    if (ccode !== null) {
      if (ccode === "0") {
        setStatus("success");
        clearCart();

        // Try sessionStorage first, fallback to looking up by Order param (order_number)
        const resolveOrderId = async (): Promise<string | null> => {
          const stored = sessionStorage.getItem("hyp_order_id");
          if (stored) return stored;
          // Fallback: HYP returns the Order param which is our order_number
          const hypOrderNum = searchParams.get("Order");
          if (hypOrderNum) {
            const { data } = await supabase
              .from("orders")
              .select("id")
              .eq("order_number", Number(hypOrderNum))
              .maybeSingle();
            return data?.id || null;
          }
          // Last resort: use the route order number
          if (orderNumber) {
            const { data } = await supabase
              .from("orders")
              .select("id")
              .eq("order_number", Number(orderNumber))
              .maybeSingle();
            return data?.id || null;
          }
          return null;
        };

        resolveOrderId().then(async (orderId) => {
          if (!orderId) return;
          const hypParams: Record<string, string> = {};
          const paramNames = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign", "Bank", "Payments", "UserId", "Brand", "Issuer", "L4digit", "street", "city", "zip", "cell", "Coin", "Tmonth", "Tyear", "errMsg", "Hesh"];
          for (const name of paramNames) {
            const val = searchParams.get(name);
            if (val !== null) hypParams[name] = val;
          }
          supabase.functions.invoke("hyp-verify-payment", {
            body: { ...hypParams, order_id: orderId },
          }).then(() => {
            supabase.functions.invoke("order-sms-trigger", {
              body: { order_id: orderId, trigger_type: "order_created" },
            }).catch(console.error);
            sessionStorage.removeItem("hyp_order_id");
            sessionStorage.removeItem("hyp_order_number");
          }).catch((err) => console.error("Background verify error:", err));

          // Fire Purchase pixel with SKUs
          const amount = searchParams.get("Amount");
          if (amount) {
            const { data: items } = await supabase
              .from("order_items")
              .select("variation_id, bundle_variation_id, product_variations(sku), bundle_variations(sku)")
              .eq("order_id", orderId);
            const skus = (items || []).map((i: any) =>
              i.bundle_variations?.sku || i.product_variations?.sku || i.bundle_variation_id || i.variation_id
            );
            fbq("Purchase", {
              content_ids: skus,
              value: parseFloat(amount),
              currency: "ILS",
              content_type: "product",
            });
          }
        }).catch(console.error);
      } else {
        setStatus("error");
      }
      return;
    }

    setStatus("success");
    clearCart();

    // Non-HYP: look up order items for SKUs
    if (orderNumber) {
      const { data: orderRow } = await supabase
        .from("orders")
        .select("id, total")
        .eq("order_number", Number(orderNumber))
        .maybeSingle();
      if (orderRow) {
        const { data: items } = await supabase
          .from("order_items")
          .select("variation_id, bundle_variation_id, product_variations(sku), bundle_variations(sku)")
          .eq("order_id", orderRow.id);
        const skus = (items || []).map((i: any) =>
          i.bundle_variations?.sku || i.product_variations?.sku || i.bundle_variation_id || i.variation_id
        );
        fbq("Purchase", {
          content_ids: skus,
          value: orderRow.total,
          currency: "ILS",
          content_type: "product",
        });
      }
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-bold text-foreground mb-3">{t("جاري التحقق...", "מאמת...")}</h1>
        <p className="text-muted-foreground">{t("يرجى الانتظار", "אנא המתן")}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">{t("خطأ في الدفع", "שגיאה בתשלום")}</h1>
        <p className="text-muted-foreground mb-2">{t("رقم الطلب:", "מספר הזמנה:")} <span className="font-bold text-primary">#{orderNumber}</span></p>
        <p className="text-muted-foreground mb-8">{t("فشل الدفع. إذا تم الخصم، سيتواصل معك ممثلنا.", "התשלום לא הצליח. אם חויבת, נציג יצור איתך קשר.")}</p>
        <Link
          to="/"
          className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          {t("العودة للرئيسية", "חזרה לדף הבית")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-foreground mb-3">
        {status === "pending"
          ? t("تم استلام طلبك!", "ההזמנה התקבלה!")
          : t("تم الدفع بنجاح!", "התשלום בוצע בהצלחה!")}
      </h1>
      <p className="text-muted-foreground mb-2">{t("رقم الطلب:", "מספר הזמנה:")} <span className="font-bold text-gold">#{orderNumber}</span></p>
      <p className="text-muted-foreground mb-8">
        {status === "pending"
          ? t("سنتواصل معك قريباً لتأكيد الدفع", "ניצור איתך קשר בקרוב לאישור התשלום")
          : t("سنتواصل معك قريباً لتأكيد الطلب", "ניצור איתך קשר בקרוב לאישור ההזמנה")}
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/"
          className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          {t("العودة للرئيسية", "חזרה לדף הבית")}
        </Link>
      </div>
    </div>
  );
}

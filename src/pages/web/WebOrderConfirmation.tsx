import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/lib/web-cart-store";
import { useLanguage } from "@/hooks/useLanguage";

type UiState = "loading" | "success" | "error" | "pending";

/**
 * Confirmation page after payment / cash order.
 *
 * Primary flow (HYP): the customer is redirected back from HYP via the
 * `hyp-callback` edge function, which has ALREADY verified the payment
 * server-side and 302'd here with `?status=ok|already|failed|amount_mismatch|error`.
 * This page just reads the status and renders the right UI.
 *
 * Fallback: if the HYP portal is still configured to redirect directly here
 * (old setup, with raw `CCode`/`Id`/... in the URL), we fall back to calling
 * `hyp-verify-payment` from the browser so payments still get verified even
 * before the merchant switches to the callback URL.
 *
 * Cash / cash-on-delivery orders arrive here with no HYP params — we show
 * success right away (the order row is already authoritative).
 */
export default function WebOrderConfirmation() {
  const { orderNumber: routeOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const { t } = useLanguage();
  const orderNumber = routeOrderNumber || searchParams.get("Order");
  const [status, setStatus] = useState<UiState>("loading");
  const ranRef = useRef(false);

  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  // If we were rendered inside an iframe (HYP payment iframe on checkout),
  // break out to the top window so the URL (with CCode etc.) is the real page.
  useEffect(() => {
    if (!isIframe) return;
    try {
      window.top!.location.href = window.location.href;
    } catch {
      window.parent.postMessage({ type: "hyp-payment-done", url: window.location.href }, "*");
    }
  }, [isIframe]);

  useEffect(() => {
    if (isIframe) return;
    if (ranRef.current) return;
    ranRef.current = true;

    const statusParam = searchParams.get("status"); // set by hyp-callback edge fn
    const ccode = searchParams.get("CCode"); // legacy direct-from-HYP flow
    const paymentParam = searchParams.get("payment"); // local cash/pending sentinel

    // ── Local "pending" sentinel (HYP create-payment failed; we saved the order
    //    and navigated here to let the customer know).
    if (paymentParam === "pending") {
      setStatus("pending");
      clearCart();
      return;
    }

    // ── Happy path: came from hyp-callback edge function (server already verified).
    if (statusParam) {
      if (statusParam === "ok" || statusParam === "already") {
        setStatus("success");
        clearCart();
        sessionStorage.removeItem("hyp_order_id");
        sessionStorage.removeItem("hyp_order_number");
        if (statusParam === "ok") firePurchasePixel(orderNumber, searchParams.get("Amount"));
        return;
      }
      // failed / amount_mismatch / error — all surface as error to the customer
      setStatus("error");
      return;
    }

    // ── Fallback: raw CCode from HYP (old portal config, no hyp-callback yet).
    if (ccode !== null) {
      if (ccode !== "0") {
        setStatus("error");
        return;
      }
      runFallbackVerify(searchParams, orderNumber, setStatus, clearCart);
      return;
    }

    // ── Cash / no payment params — order is already authoritative.
    setStatus("success");
    clearCart();
    firePurchasePixelForOrder(orderNumber);
  }, [isIframe, searchParams, orderNumber, clearCart]);

  if (status === "loading") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-bold text-foreground mb-3">{t("جاري التحقق من الدفع...", "מאמת תשלום...")}</h1>
        <p className="text-muted-foreground">{t("يرجى الانتظار، لا تغلق الصفحة", "אנא המתן, אל תסגור את הדף")}</p>
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

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

type OrderItemForPixel = {
  product_variations?: { products?: { sku?: string | null } | null } | null;
  bundle_variations?: { bundles?: { products?: { sku?: string | null } | null } | null } | null;
};

async function skusForOrder(orderId: string): Promise<string[]> {
  const { data } = await supabase
    .from("order_items")
    .select("product_variations(products(sku)), bundle_variations(bundles(products(sku)))")
    .eq("order_id", orderId);
  return ((data as OrderItemForPixel[] | null) || [])
    .map((i) => i.bundle_variations?.bundles?.products?.sku || i.product_variations?.products?.sku || null)
    .filter((sku): sku is string => Boolean(sku));
}

async function firePurchasePixel(orderNumber: string | null, amountStr: string | null): Promise<void> {
  if (!orderNumber || !amountStr) return;
  const amount = parseFloat(amountStr);
  if (!isFinite(amount)) return;
  const { data: orderRow } = await supabase
    .from("orders")
    .select("id")
    .eq("order_number", Number(orderNumber))
    .maybeSingle();
  if (!orderRow) return;
  const skus = await skusForOrder(orderRow.id);
  if (skus.length > 0) {
    fbq("Purchase", { content_ids: skus, value: amount, currency: "ILS", content_type: "product" });
  }
}

async function firePurchasePixelForOrder(orderNumber: string | null): Promise<void> {
  if (!orderNumber) return;
  const { data: orderRow } = await supabase
    .from("orders")
    .select("id, total")
    .eq("order_number", Number(orderNumber))
    .maybeSingle();
  if (!orderRow) return;
  const skus = await skusForOrder(orderRow.id);
  if (skus.length > 0) {
    fbq("Purchase", { content_ids: skus, value: Number(orderRow.total), currency: "ILS", content_type: "product" });
  }
}

function runFallbackVerify(
  searchParams: URLSearchParams,
  orderNumber: string | null,
  setStatus: (s: UiState) => void,
  clearCart: () => void,
): void {
  clearCart();

  (async () => {
    // Resolve order id from session (set during checkout) or order_number query.
    let orderId: string | null = sessionStorage.getItem("hyp_order_id");
    if (!orderId) {
      const hypOrderNum = searchParams.get("Order") || orderNumber;
      if (hypOrderNum) {
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", Number(hypOrderNum))
          .maybeSingle();
        orderId = data?.id || null;
      }
    }

    if (!orderId) {
      console.error("Could not resolve orderId for HYP verify fallback");
      setStatus("error");
      return;
    }

    const hypParams: Record<string, string> = {};
    const paramNames = ["Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign", "Bank", "Payments", "UserId", "Brand", "Issuer", "L4digit", "street", "city", "zip", "cell", "Coin", "Tmonth", "Tyear", "errMsg", "Hesh"];
    for (const name of paramNames) {
      const val = searchParams.get(name);
      if (val !== null) hypParams[name] = val;
    }

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("hyp-verify-payment", {
        body: { ...hypParams, order_id: orderId },
      });

      if (verifyError || verifyData?.amount_mismatch || !verifyData?.verified) {
        console.error("Fallback verify failed:", verifyError, verifyData);
        setStatus("error");
        return;
      }

      setStatus("success");
      sessionStorage.removeItem("hyp_order_id");
      sessionStorage.removeItem("hyp_order_number");
      await firePurchasePixel(orderNumber, searchParams.get("Amount"));
    } catch (err) {
      console.error("Fallback verify exception:", err);
      setStatus("error");
    }
  })();
}

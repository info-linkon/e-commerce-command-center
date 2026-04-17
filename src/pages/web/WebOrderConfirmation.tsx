import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/lib/web-cart-store";
import { useLanguage } from "@/hooks/useLanguage";
import { describeCCode, isCCodeSuccess } from "@/lib/hyp-ccode";

type Status = "loading" | "success" | "error" | "pending";
const HYP_ORDER_KEY = "hyp_pending_order";

interface HypPendingOrder {
  order_id: string;
  order_number: number;
  total: number;
  started_at: number;
}

const HYP_PARAM_NAMES = [
  "Id", "CCode", "Amount", "ACode", "Order", "Fild1", "Fild2", "Fild3", "Sign",
  "Bank", "Payments", "UserId", "Brand", "Issuer", "L4digit", "street", "city",
  "zip", "cell", "Coin", "Tmonth", "Tyear", "errMsg", "Hesh",
];

function readPendingOrder(): HypPendingOrder | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(HYP_ORDER_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as HypPendingOrder;
      if (parsed?.order_id) return parsed;
    } catch {
      // ignore and try next store
    }
  }
  return null;
}

function clearPendingOrder() {
  for (const store of [sessionStorage, localStorage]) {
    try { store.removeItem(HYP_ORDER_KEY); } catch { /* no-op */ }
  }
}

export default function WebOrderConfirmation() {
  const { orderNumber: routeOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const { t } = useLanguage();
  const orderNumber = routeOrderNumber || searchParams.get("Order");
  const [status, setStatus] = useState<Status>("loading");
  const [ccode, setCcode] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ last4?: string | null } | null>(null);
  const verifyCalledRef = useRef(false);

  const isIframe = typeof window !== "undefined" && window.self !== window.top;

  // Defensive: if this page ever loads inside an iframe (legacy flow or an
  // embedded bank page), break out to the top window so the user sees a
  // full-width confirmation instead of a cramped iframe.
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
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    const urlCCode = searchParams.get("CCode");
    const paymentParam = searchParams.get("payment");

    // Cash / non-HYP success path: no CCode, no payment=pending
    if (urlCCode === null && paymentParam !== "pending") {
      setStatus("success");
      clearCart();
      clearPendingOrder();
      firePurchasePixelByOrderNumber(orderNumber);
      return;
    }

    // Manual "saved but not paid" redirect (e.g. HYP create-payment failed)
    if (paymentParam === "pending") {
      setStatus("pending");
      clearCart();
      clearPendingOrder();
      return;
    }

    // HYP callback path
    setCcode(urlCCode);

    if (!isCCodeSuccess(urlCCode)) {
      // Known failure / grey-status (600/700/800/etc.) — don't call verify
      setStatus("error");
      return;
    }

    // CCode=0 — clear cart optimistically, then verify server-side
    clearCart();

    (async () => {
      const orderId = await resolveOrderId(searchParams, orderNumber);

      if (!orderId) {
        // We can't verify without an order id. Show a soft success.
        setStatus("success");
        clearPendingOrder();
        return;
      }

      const hypParams: Record<string, string> = {};
      for (const name of HYP_PARAM_NAMES) {
        const val = searchParams.get(name);
        if (val !== null) hypParams[name] = val;
      }

      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
          "hyp-verify-payment",
          { body: { ...hypParams, order_id: orderId } },
        );

        if (verifyError) {
          console.error("Verify error:", verifyError);
          setCcode("network_error");
          setStatus("error");
          return;
        }

        if (verifyData?.verified) {
          setStatus("success");
          setPaymentInfo({ last4: verifyData.last4 || null });
          clearPendingOrder();

          if (!verifyData.already_processed) {
            supabase.functions.invoke("order-sms-trigger", {
              body: { order_id: orderId, trigger_type: "order_created" },
            }).catch(console.error);

            const amount = searchParams.get("Amount");
            firePurchasePixelByOrderId(orderId, amount ? parseFloat(amount) : null);
          }
        } else {
          setCcode(verifyData?.CCode ?? "unknown");
          setStatus("error");
        }
      } catch (err) {
        console.error("Background verify error:", err);
        setCcode("network_error");
        setStatus("error");
      }
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {t("جاري التحقق من الدفع...", "מאמת תשלום...")}
        </h1>
        <p className="text-muted-foreground">
          {t("يرجى الانتظار، لا تغلق الصفحة", "אנא המתן, אל תסגור את הדף")}
        </p>
      </div>
    );
  }

  if (status === "error") {
    const msg = describeCCode(ccode);
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {t("تعذّر إتمام الدفع", "התשלום לא הושלם")}
        </h1>
        {orderNumber && (
          <p className="text-muted-foreground mb-2">
            {t("رقم الطلب:", "מספר הזמנה:")} <span className="font-bold text-primary">#{orderNumber}</span>
          </p>
        )}
        <p className="text-muted-foreground mb-2">
          {t(msg.ar, msg.he)}
        </p>
        {ccode && ccode !== "network_error" && ccode !== "amount_mismatch" && (
          <p className="text-xs text-muted-foreground mb-6">
            {t("رمز الخطأ:", "קוד שגיאה:")} <span className="font-mono">{ccode}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/cart"
            className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
          >
            {t("العودة إلى السلة", "חזרה לסל")}
          </Link>
          <Link
            to="/"
            className="px-6 py-3 border border-border rounded-full font-medium hover:bg-muted transition-colors"
          >
            {t("الصفحة الرئيسية", "דף הבית")}
          </Link>
        </div>
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
      {orderNumber && (
        <p className="text-muted-foreground mb-2">
          {t("رقم الطلب:", "מספר הזמנה:")} <span className="font-bold text-gold">#{orderNumber}</span>
        </p>
      )}
      {paymentInfo?.last4 && (
        <p className="text-xs text-muted-foreground mb-2">
          {t("البطاقة المنتهية بـ", "כרטיס המסתיים ב־")} <span className="font-mono">{paymentInfo.last4}</span>
        </p>
      )}
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

// ── helpers ──

async function resolveOrderId(
  searchParams: URLSearchParams,
  orderNumber: string | null,
): Promise<string | null> {
  const pending = readPendingOrder();
  if (pending?.order_id) return pending.order_id;

  const orderNumCandidate = searchParams.get("Order") || orderNumber;
  if (orderNumCandidate) {
    const num = Number(orderNumCandidate);
    if (Number.isFinite(num)) {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("order_number", num)
        .maybeSingle();
      return data?.id || null;
    }
  }
  return null;
}

async function firePurchasePixelByOrderId(orderId: string, amount: number | null) {
  if (!amount || !Number.isFinite(amount)) return;
  try {
    const { data: items } = await supabase
      .from("order_items")
      .select("product_variations(products(sku)), bundle_variations(bundles(products(sku)))")
      .eq("order_id", orderId);
    const skus = (items || [])
      .map((i: any) => i.bundle_variations?.bundles?.products?.sku || i.product_variations?.products?.sku)
      .filter(Boolean);
    if (skus.length > 0) {
      fbq("Purchase", {
        content_ids: skus,
        value: amount,
        currency: "ILS",
        content_type: "product",
      });
    }
  } catch (err) {
    console.error("Purchase pixel error:", err);
  }
}

async function firePurchasePixelByOrderNumber(orderNumber: string | null) {
  if (!orderNumber) return;
  const num = Number(orderNumber);
  if (!Number.isFinite(num)) return;
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("id, total")
      .eq("order_number", num)
      .maybeSingle();
    if (orderRow) {
      await firePurchasePixelByOrderId(orderRow.id, Number(orderRow.total));
    }
  } catch (err) {
    console.error("Purchase pixel (by number) error:", err);
  }
}

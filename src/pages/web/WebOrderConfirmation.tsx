import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fbq } from "@/lib/meta-pixel";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/lib/web-cart-store";
import { useLanguage } from "@/hooks/useLanguage";
import { incrementCouponUsage } from "@/hooks/useCoupons";

type UiState = "loading" | "success" | "error" | "pending";

// Statuses that mean the order is already paid/processed. Used by the error
// safety-net poll: if HYP's notify URL arrives AFTER the browser redirect
// marks the payment as failed, we still want the customer to see success.
const PAID_STATUSES = new Set(["processing", "picking", "shipping", "completed"]);

/**
 * Confirmation page after payment / cash order.
 *
 * Primary flow (HYP): the customer is redirected back from HYP via the
 * `hyp-callback` edge function, which has ALREADY verified the payment
 * server-side and 302'd here with `?status=ok|already|failed|amount_mismatch|error`.
 * This page just reads the status and renders the right UI.
 *
 * Error safety-net: when status=failed/error/amount_mismatch we still poll
 * the order row for a few seconds because HYP's server-to-server notify can
 * arrive after the browser redirect. If the notify eventually marks the order
 * as paid, we upgrade the UI to success.
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
  const [status, setStatus] = useState<UiState>(() => {
    if (typeof window === "undefined") return "loading";

    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    const paymentParam = params.get("payment");
    const ccode = params.get("CCode");

    if (paymentParam === "pending") return "pending";
    if (statusParam === "ok" || statusParam === "already") return "success";
    if (statusParam || ccode !== null) return "loading";

    return "success";
  });
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
        // Fresh payment (not a re-processed duplicate) → increment coupon
        // usage and fire Meta Pixel. `already` = idempotent replay, skip both.
        if (statusParam === "ok") {
          bumpCouponFromSession();
          firePurchasePixel(orderNumber, searchParams.get("Amount"));
        }
        sessionStorage.removeItem("hyp_order_id");
        sessionStorage.removeItem("hyp_order_number");
        sessionStorage.removeItem("hyp_coupon_id");
        return;
      }
      // failed / amount_mismatch / error — before giving up, check if notify
      // already (or will shortly) mark the order as paid.
      pollOrderAfterFailure(orderNumber, setStatus, clearCart);
      return;
    }

    // ── Fallback: raw CCode from HYP (old portal config, no hyp-callback yet).
    if (ccode !== null) {
      if (ccode !== "0") {
        pollOrderAfterFailure(orderNumber, setStatus, clearCart);
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
    const reason = searchParams.get("reason");
    const statusParam = searchParams.get("status");
    const errorBody = (() => {
      if (statusParam === "amount_mismatch") {
        return t(
          "حدث خطأ في مطابقة مبلغ الدفع. لا تُعِد الدفع — سيتواصل معك ممثلنا.",
          "אי-התאמה בסכום התשלום. אל תשלם שוב — נציג יצור איתך קשר.",
        );
      }
      if (reason === "order_not_found") {
        return t(
          "لم نتمكن من العثور على الطلب. يرجى التواصل مع الدعم مع الاحتفاظ برقم العملية.",
          "לא הצלחנו למצוא את ההזמנה. צור קשר עם התמיכה ושמור את מספר העסקה.",
        );
      }
      return t(
        "فشل الدفع. إذا تم الخصم، سيتواصل معك ممثلنا.",
        "התשלום לא הצליח. אם חויבת, נציג יצור איתך קשר.",
      );
    })();
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">{t("خطأ في الدفع", "שגיאה בתשלום")}</h1>
        <p className="text-muted-foreground mb-2">{t("رقم الطلب:", "מספר הזמנה:")} <span className="font-bold text-primary">#{orderNumber}</span></p>
        <p className="text-muted-foreground mb-8">{errorBody}</p>
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

// Public-safe summary fetched via the `order-summary` edge function.
// Anon doesn't (and shouldn't) have SELECT on orders, so this is the only
// way the confirmation page can read its own order back.
async function fetchOrderSummary(
  orderNumber: string | null,
): Promise<{ id?: string; total?: number; status?: string; hyp_transaction_id?: string | null; items?: Array<{ sku?: string | null }> } | null> {
  if (!orderNumber) return null;
  const token = sessionStorage.getItem("hyp_order_token") || "";
  try {
    const { data, error } = await supabase.functions.invoke("order-summary", {
      body: null,
      method: "GET" as any,
      headers: {} as any,
    } as any);
    // supabase.functions.invoke doesn't support GET query params well — use fetch.
    if (error) console.warn("invoke fallback", error);
    if (data) return (data as any).order || null;
  } catch {
    // fall through to direct fetch
  }

  try {
    const url = new URL(`https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/order-summary`);
    url.searchParams.set("order_number", String(orderNumber));
    if (token) url.searchParams.set("token", token);
    const res = await fetch(url.toString(), {
      headers: {
        apikey: (supabase as any).supabaseKey || "",
        Authorization: `Bearer ${(supabase as any).supabaseKey || ""}`,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { ...(json.order || {}), items: json.items || [] };
  } catch (err) {
    console.error("order-summary fetch failed:", err);
    return null;
  }
}

async function firePurchasePixel(orderNumber: string | null, amountStr: string | null): Promise<void> {
  if (!orderNumber) return;
  const amount = amountStr ? parseFloat(amountStr) : NaN;
  const summary = await fetchOrderSummary(orderNumber);
  if (!summary) return;
  const value = isFinite(amount) ? amount : Number(summary.total || 0);
  // order-summary doesn't expose SKUs today; use order_number as fallback id.
  fbq("Purchase", { content_ids: [String(orderNumber)], value, currency: "ILS", content_type: "product" });
}

async function firePurchasePixelForOrder(orderNumber: string | null): Promise<void> {
  await firePurchasePixel(orderNumber, null);
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
      pollOrderAfterFailure(orderNumber, setStatus, clearCart);
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
        pollOrderAfterFailure(orderNumber, setStatus, clearCart);
        return;
      }

      setStatus("success");
      if (!verifyData.already_processed) {
        bumpCouponFromSession();
      }
      sessionStorage.removeItem("hyp_order_id");
      sessionStorage.removeItem("hyp_order_number");
      sessionStorage.removeItem("hyp_coupon_id");
      await firePurchasePixel(orderNumber, searchParams.get("Amount"));
    } catch (err) {
      console.error("Fallback verify exception:", err);
      pollOrderAfterFailure(orderNumber, setStatus, clearCart);
    }
  })();
}

function bumpCouponFromSession(): void {
  const couponId = sessionStorage.getItem("hyp_coupon_id");
  if (!couponId) return;
  // Fire-and-forget: coupon bookkeeping shouldn't block the success UI
  incrementCouponUsage(couponId).catch((err) => console.error("coupon increment failed:", err));
}

// Safety net for when the browser-redirect verify failed but HYP's
// server-to-server notify is still in flight. Poll the order row for up to
// ~15s — if the notify lands during that window the customer sees "success"
// instead of a false "failed". Keeps the cart cleared either way.
async function pollOrderAfterFailure(
  orderNumber: string | null,
  setStatus: (s: UiState) => void,
  clearCart: () => void,
): Promise<void> {
  clearCart();
  if (!orderNumber) {
    setStatus("error");
    return;
  }

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("status, hyp_transaction_id")
        .eq("order_number", Number(orderNumber))
        .maybeSingle();
      if (data && (data.hyp_transaction_id || PAID_STATUSES.has(String(data.status)))) {
        setStatus("success");
        bumpCouponFromSession();
        sessionStorage.removeItem("hyp_order_id");
        sessionStorage.removeItem("hyp_order_number");
        sessionStorage.removeItem("hyp_coupon_id");
        await firePurchasePixelForOrder(orderNumber);
        return;
      }
    } catch (err) {
      console.error("order status poll failed:", err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  setStatus("error");
}

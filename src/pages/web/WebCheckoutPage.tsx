import { useCartStore } from "@/lib/web-cart-store";
import { Minus as MinusIcon, Plus as PlusIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateCoupon, calcDiscount, Coupon } from "@/hooks/useCoupons";
import { Loader2, Tag, X, CreditCard, Banknote, MapPin, User, Phone, Mail, Home, MessageSquare, ShieldCheck, Lock, ChevronLeft, ChevronDown, ShoppingBag, Package, Truck, Check } from "lucide-react";
import { fbq, fbqIdentify } from "@/lib/meta-pixel";
import { ttq, ttqIdentify } from "@/lib/tiktok-pixel";
import { gaBeginCheckout } from "@/lib/gtag";
import { useSiteSection } from "@/hooks/useSiteContent";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/hooks/useLanguage";
import logo from "@/assets/logo.webp";

type ShippingMethod = "delivery" | "pickup";
type PaymentMethodType = "cash" | "credit";

interface PaymentSettings {
  cash: { enabled: boolean; label: string };
  credit: { enabled: boolean; label: string };
}

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  cash: { enabled: true, label: "الدفع عند الاستلام" },
  credit: { enabled: true, label: "بطاقة ائتمان" },
};

export default function WebCheckoutPage() {
  const { items, totalPrice, clearCart, shippingCost, updateQuantity } = useCartStore();
  const [emailError, setEmailError] = useState("");
  const [geoError, setGeoError] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hypPaymentUrl, setHypPaymentUrl] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Mobile stepper: 1 = details, 2 = payment, 3 = review & confirm
  const [mobileStep, setMobileStep] = useState<1 | 2 | 3>(1);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Step of the verification dialog: sending → enter code → verifying → (done)
  const [otpStep, setOtpStep] = useState<"sending" | "enter" | "verifying" | "send_failed">("enter");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Lock page scroll while the dialog is open so it can't get "stuck" behind the keyboard.
  useEffect(() => {
    if (!otpDialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [otpDialogOpen]);

  const withTimeout = <T,>(p: Promise<T>, ms = 15000) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

  const sendOtp = async (phone: string) => {
    if (!phone || phone.replace(/[\s\-()]/g, "").length < 9) return;
    // Open the dialog immediately so the shopper sees progress.
    setOtpPhone(phone);
    setOtpCode("");
    setOtpError("");
    setOtpStep("sending");
    setOtpDialogOpen(true);
    setOtpLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", { body: { action: "send", phone } }),
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      setOtpStep("enter");
      setResendIn(60);
    } catch (err) {
      console.error("OTP send error:", err);
      setOtpError(t("تعذر إرسال الرمز، حاول مرة أخرى", "לא הצלחנו לשלוח את הקוד, נסה שוב"));
      setOtpStep("send_failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (codeArg?: string) => {
    const code = codeArg ?? otpCode;
    if (!code || code.length < 4 || otpLoading) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpStep("verifying");
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("send-otp", { body: { action: "verify", phone: otpPhone, code } }),
      );
      if (error) throw error;
      if (data?.valid) {
        setOtpVerified(true);
        setOtpDialogOpen(false);
        toast.success(t("تم التحقق بنجاح", "האימות הצליח"));
        // Continue the cash order automatically once the phone is verified.
        setTimeout(() => formRef.current?.requestSubmit(), 0);
      } else {
        setOtpError(data?.error || t("رمز غير صحيح", "קוד שגוי"));
        setOtpCode("");
        setOtpStep("enter");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setOtpError(t("حدث خطأ في التحقق، حاول مرة أخرى", "שגיאה באימות, נסה שוב"));
      setOtpStep("enter");
    } finally {
      setOtpLoading(false);
    }
  };

  // Attach the shopper's details to the pixels as soon as they're typed, so
  // checkout events (not just Purchase) carry email/phone for matching.
  const handleIdentityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value) return;
    const isEmail = e.target.name === "email";
    fbqIdentify(isEmail ? { email: value } : { phone: value });
    ttqIdentify(isEmail ? { email: value } : { phone: value });
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleIdentityBlur(e);
    const phone = e.target.value.trim();
    // Phone changed after verification → require verifying the new number.
    if (otpVerified && phone !== otpPhone) {
      setOtpVerified(false);
      setOtpSent(false);
      setOtpCode("");
    }
  };

  const { data: paymentSettingsRow } = useSiteSection("settings", "payment_methods");
  const { data: shippingSettingsRow } = useSiteSection("settings", "shipping_methods");
  const { t, lang, localizedPath } = useLanguage();

  const shippingSettings = (shippingSettingsRow?.content || {}) as any;
  const deliveryEnabled = shippingSettings.delivery_enabled !== false;
  const pickupEnabled = shippingSettings.pickup_enabled !== false;
  const deliveryLabel = t(shippingSettings.delivery_label || "توصيل للبيت", shippingSettings.delivery_label_he || "משלוח עד הבית");
  const pickupLabel = t(shippingSettings.pickup_label || "استلام ذاتي", shippingSettings.pickup_label_he || "איסוף עצמי");
  const pickupNote = t(shippingSettings.pickup_note || "", shippingSettings.pickup_note_he || "");

  const paymentSettings: PaymentSettings = paymentSettingsRow?.content
    ? { ...DEFAULT_PAYMENT_SETTINGS, ...(paymentSettingsRow.content as unknown as PaymentSettings) }
    : DEFAULT_PAYMENT_SETTINGS;

  const enabledMethods: PaymentMethodType[] = [];
  if (paymentSettings.cash.enabled) enabledMethods.push("cash");
  if (paymentSettings.credit.enabled) enabledMethods.push("credit");

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    // Meta Pixel: InitiateCheckout — send variation-level SKUs so each line
    // matches a catalog item (`g:id`). Fall back to the parent catalog SKU
    // (`g:item_group_id`) only if the variation SKU is missing.
    const contents = items
      .map((i) => ({ id: (i.sku || i.catalogId || "") as string, quantity: i.quantity }))
      .filter((c) => !!c.id);
    if (contents.length > 0) {
      fbq("InitiateCheckout", {
        content_ids: contents.map((c) => c.id),
        contents,
        content_type: "product",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value: totalPrice(),
        currency: "ILS",
      });
      // TikTok Pixel: InitiateCheckout
      ttq("InitiateCheckout", {
        contents: contents.map((c) => ({
          content_id: c.id,
          content_type: "product",
          quantity: c.quantity,
        })),
        value: totalPrice(),
        currency: "ILS",
      });
    }
    // GA4: begin_checkout
    const gaItems = items
      .map((i) => {
        const sku = (i.sku || i.catalogId || "") as string;
        if (!sku) return null;
        return {
          item_id: sku,
          item_name: i.productName,
          item_variant: i.variationName || undefined,
          price: i.price,
          quantity: i.quantity,
        };
      })
      .filter(Boolean) as any[];
    if (gaItems.length > 0) {
      gaBeginCheckout(totalPrice(), gaItems);
    }
  }, []);

  // Listen for postMessage from HYP iframe (success/error redirect)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "hyp-payment-done" && e.data?.url) {
        clearCart();
        window.location.href = e.data.url;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const subtotal = totalPrice();
  const shipping = shippingMethod === "pickup" ? 0 : shippingMethod === "delivery" ? shippingCost() : 0;
  const discount = appliedCoupon ? calcDiscount(appliedCoupon, subtotal) : 0;
  const finalTotal = subtotal - discount + shipping;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    const result = await validateCoupon(couponCode, subtotal);
    if (result.valid && result.coupon) {
      setAppliedCoupon(result.coupon);
      toast.success("تم تطبيق الكوبون بنجاح!");
    } else {
      setCouponError(result.error || "קוד לא תקין");
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Validate only the fields of the current mobile step before advancing.
  const validateMobileStep = (step: number): boolean => {
    const form = formRef.current;
    if (step === 1) {
      if (!shippingMethod) {
        toast.error(t("يرجى اختيار طريقة التوصيل", "יש לבחור שיטת משלוח"));
        return false;
      }
      if (!form) return true;
      const names = ["name", "phone", ...(shippingMethod === "delivery" ? ["city", "address"] : [])];
      for (const n of names) {
        const el = form.querySelector<HTMLInputElement>(`[name="${n}"]`);
        if (el && !el.checkValidity()) {
          el.reportValidity();
          el.focus();
          return false;
        }
      }
    }
    if (step === 2 && !selectedPayment) {
      toast.error(t("يرجى اختيار طريقة الدفع", "יש לבחור אמצעי תשלום"));
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateMobileStep(mobileStep)) return;
    setMobileStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setMobileStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Guard against double-submit (button is also disabled={loading}, but Enter
    // key presses and the mobile sticky button can still race the first click).
    if (loading || submittedRef.current) return;
    if (items.length === 0) { toast.error("السلة فارغة"); return; }
    if (!shippingMethod) {
      toast.error(t("يرجى اختيار طريقة التوصيل", "יש לבחור שיטת משלוח"));
      return;
    }
    if (!selectedPayment) {
      toast.error(t("يرجى اختيار طريقة الدفع", "יש לבחור אמצעי תשלום"));
      return;
    }
    // Phone verification is required only for cash orders (credit is verified by the card payment).
    if (selectedPayment === "cash") {
      const phoneNow = String(new FormData(e.currentTarget).get("phone") || "").trim();
      if (!otpVerified || phoneNow !== otpPhone) {
        if (phoneNow.replace(/[\s\-()]/g, "").length < 9) {
          toast.error(t("يرجى إدخال رقم هاتف صحيح", "יש להזין מספר טלפון תקין"));
          return;
        }
        if (otpSent && phoneNow === otpPhone) { setOtpStep("enter"); setOtpDialogOpen(true); }
        else { setOtpVerified(false); setOtpCode(""); sendOtp(phoneNow); }
        return;
      }
    }

    // Geo-blocking validation
    if (shippingMethod === "delivery") {
      const formData = new FormData(e.currentTarget);
      const city = (formData.get("city") as string || "").trim().toLowerCase();
      const blockedKeywords = [
        "jordan", "ירדן", "الأردن", "عمان", "oman", "עומאן",
        "amman", "عمّان", "irbid", "اربد", "zarqa", "الزرقاء",
        "europe", "אירופה", "أوروبا", "germany", "גרמניה", "ألمانيا",
        "france", "צרפת", "فرنسا", "uk", "בריטניה", "بريطانيا",
        "italy", "איטליה", "إيطاليا", "spain", "ספרד", "إسبانيا",
        "netherlands", "הולנד", "هولندا", "belgium", "בלגיה", "بلجيكا",
        "austria", "אוסטריה", "النمسا", "sweden", "שוודיה", "السويد",
      ];
      if (blockedKeywords.some((kw) => city.includes(kw))) {
        setGeoError(t("عذراً، لا نوفر خدمة التوصيل لهذه المنطقة", "מצטערים, אין משלוח לאזור זה"));
        setLoading(false);
        return;
      }
      setGeoError("");
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const customerName = form.get("name") as string;
    const customerPhone = form.get("phone") as string;
    // Clean invisible RTL marks / spaces that mobile keyboards & autofill add.
    const customerEmail = ((form.get("email") as string) || "")
      .replace(/[\s\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
      .toLowerCase();
    if (customerEmail && !/^[^@]+@[^@]+\.[a-z]{2,}$/i.test(customerEmail)) {
      setEmailError(t("البريد الإلكتروني غير صحيح — صحّحه أو اتركه فارغاً", "כתובת האימייל לא תקינה — תקן או השאר ריק"));
      setLoading(false);
      document.getElementById("email")?.focus();
      return;
    }
    setEmailError("");
    const isCash = selectedPayment === "cash";

    // Advanced matching: identify the shopper before the order events fire.
    fbqIdentify({ email: customerEmail, phone: customerPhone, name: customerName });
    ttqIdentify({ email: customerEmail, phone: customerPhone });

    try {
      const uniqueCartVariationIds = Array.from(new Set(items.map((item) => item.variationId)));
      const { data: matchedVariations, error: matchedVariationsError } = await supabase
        .from("product_variations")
        .select("id, product_id")
        .in("id", uniqueCartVariationIds);

      if (matchedVariationsError) throw matchedVariationsError;

      const matchedVariationIds = new Set((matchedVariations || []).map((variation) => variation.id));
      // Safety net for stale carts: items added before the bundle fix may have
      // `variationId` set to a bundle_variation.id (which won't exist in
      // product_variations). For those, resolve via the bundle's product_id
      // → "ברירת מחדל" product_variation just like the WebProductPage now does.
      const fallbackProductIds = Array.from(
        new Set(items.filter((item) => !matchedVariationIds.has(item.variationId)).map((item) => item.productId))
      );

      let fallbackVariations: { id: string; product_id: string; name: string }[] = [];
      if (fallbackProductIds.length > 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("product_variations")
          .select("id, product_id, name")
          .in("product_id", fallbackProductIds)
          .order("created_at", { ascending: true });

        if (fallbackError) throw fallbackError;
        fallbackVariations = (fallbackData || []) as { id: string; product_id: string; name: string }[];
      }

      // Prefer the canonical "ברירת מחדל" variation as the fallback. Only if
      // none exists do we fall back to the oldest variation. This prevents
      // ghost Woo-imported variations from being recorded as the customer's
      // chosen variation on bundle / simple products.
      const fallbackByProductId = new Map<string, string>();
      for (const variation of fallbackVariations) {
        if (variation.name === "ברירת מחדל") {
          fallbackByProductId.set(variation.product_id, variation.id);
        }
      }
      for (const variation of fallbackVariations) {
        if (!fallbackByProductId.has(variation.product_id)) {
          fallbackByProductId.set(variation.product_id, variation.id);
        }
      }

      const normalizedItems = items.map((item) => ({
        ...item,
        orderVariationId: matchedVariationIds.has(item.variationId)
          ? item.variationId
          : fallbackByProductId.get(item.productId) || null,
      }));

      if (normalizedItems.some((item) => !item.orderVariationId)) {
        toast.error("يوجد منتج غير صالح في السلة، احذفه وأضفه من جديد");
        return;
      }

      // All checkout writes go through this edge function so the public
      // anon key never needs INSERT/SELECT on orders/customers/payments
      // (those tables contain PII and remain authenticated-only via RLS).
      const { data: createData, error: createErr } = await supabase.functions.invoke(
        "web-create-order",
        {
          body: {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            shipping_method: shippingMethod,
            shipping_city: shippingMethod === "delivery" ? (form.get("city") as string) : null,
            shipping_address: shippingMethod === "delivery" ? (form.get("address") as string) : null,
            shipping_cost: shipping,
            payment_method: isCash ? "cash" : "credit",
            coupon_code: appliedCoupon ? appliedCoupon.code : null,
            lang,
            notes: [
              shippingMethod === "pickup" ? "🏪 איסוף עצמי" : "",
              (form.get("notes") as string) || "",
              appliedCoupon ? `קופון: ${appliedCoupon.code} (הנחה: ₪${discount.toFixed(2)})` : "",
            ].filter(Boolean).join(" | ") || null,
            items: normalizedItems.map((item) => ({
              variation_id: item.orderVariationId!,
              product_id: item.productId,
              quantity: item.quantity,
              bundle_variation_id: item.bundleVariationId || null,
            })),
          },
        },
      );

      if (createErr || !createData?.success) {
        const msg = createData?.error || createErr?.message || "حدث خطأ أثناء إرسال الطلب";
        console.error("web-create-order failed:", createErr, createData);
        toast.error(msg);
        return;
      }

      const order = {
        id: createData.order_id as string,
        order_number: createData.order_number as number,
        access_token: createData.access_token as string,
        notes: null as string | null,
      };

      if (isCash) {
        // web-create-order has already incremented coupon usage server-side
        // (atomic, runs with service role). Nothing to do here.

        // NOTE: Do NOT auto-create a payments row for COD. The cash hasn't been
        // collected yet. A real payment row (with cash_register_id) will be
        // created in the CRM only when the courier/staff actually collects the
        // money at delivery time. Otherwise the order would falsely appear paid.

        // SMS for new order is fired server-side inside web-create-order
        // (browser-side fire-and-forget could be lost when the tab closes).
        // Trigger email notification
        supabase.functions.invoke("order-email-notify", {
          body: { order_id: order.id },
        }).catch(console.error);
        submittedRef.current = true;
        navigate(localizedPath(`/order-confirmation/${order.order_number}`));
        clearCart();
        return;
      }

      // HYP success/failure URLs are configured in the HYP merchant portal
      // (blueprint §"Set Up Success and Failure Pages"), not via request params.
      const { data: hypData, error: hypError } = await supabase.functions.invoke("hyp-create-payment", {
        body: {
          order_id: order.id,
          order_number: order.order_number,
          total: finalTotal,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          info: `הזמנה #${order.order_number}`,
        },
      });

      if (hypError || !hypData?.success) {
        const hypErrMsg = hypError?.message || hypData?.error || "unknown";
        console.error("HYP payment error:", hypErrMsg);
        // hyp-create-payment has already tagged the order's `notes` with the
        // failure reason (it has the service role; anon can't UPDATE orders).
        toast.error(t("حدث خطأ في إنشاء صفحة الدفع — سيتواصل معك ممثلنا", "שגיאה ביצירת דף תשלום — נציג יצור איתך קשר"));
        submittedRef.current = true;
        navigate(localizedPath(`/order-confirmation/${order.order_number}?payment=pending`));
        clearCart();
        return;
      }

      sessionStorage.setItem("hyp_order_id", order.id);
      sessionStorage.setItem("hyp_order_number", String(order.order_number));
      // Confirmation page polls /functions/order-summary with this token
      // so it can read the order without needing direct table SELECT access.
      sessionStorage.setItem("hyp_order_token", order.access_token);
      // Coupon usage is incremented inside web-create-order (server-side),
      // so the confirmation page no longer needs to track the coupon id.
      setHypPaymentUrl(hypData.payment_url);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !hypPaymentUrl && !submittedRef.current) {
    navigate(localizedPath("/cart"));
    return null;
  }

  // Show HYP payment iframe overlay
  if (hypPaymentUrl) {
    const orderTotal = finalTotal;
    return (
      <div className="fixed inset-0 z-[100] bg-muted/50 flex flex-col">
        {/* Header with logo + secure badge */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <img src={logo} alt="الوجهة" className="w-10 h-10 rounded-full ring-1 ring-border object-cover flex-shrink-0" />
            <div>
              <span className="font-bold text-sm text-foreground">الوجهة</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="w-3 h-3 text-primary" />
                دفع آمن
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setHypPaymentUrl(null);
              navigate(localizedPath("/cart"));
            }}
          >
            <X className="w-4 h-4 ml-1" />
            إلغاء
          </Button>
        </div>

        {/* Order summary strip */}
        <div className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {items.slice(0, 3).map((item, i) => (
                  <div key={i} className="w-10 h-10 rounded-lg border-2 border-background bg-muted overflow-hidden shadow-sm">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="w-10 h-10 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shadow-sm">
                    +{items.length - 3}
                  </div>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{items.reduce((s, i) => s + i.quantity, 0)} منتجات</span>
              </div>
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-foreground">₪{orderTotal.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">المجموع الكلي</div>
            </div>
          </div>
        </div>

        {/* Iframe */}
        <iframe
          src={hypPaymentUrl}
          className="flex-1 w-full border-none bg-background"
          allow="payment"
        />
      </div>
    );
  }

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const mobileSteps = [
    { n: 1, label: t("التفاصيل", "פרטים") },
    { n: 2, label: t("الدفع", "תשלום") },
    { n: 3, label: t("التأكيد", "אישור") },
  ];

  // Shared order-summary card (desktop sidebar, mobile step 3, mobile expanded strip)
  const summaryCard = (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          {t("ملخص الطلب", "סיכום הזמנה")} ({items.length} {t("منتج", "מוצרים")})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
          {items.map((item) => (
            <div key={item.variationId} className="flex items-center gap-3">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-12 h-12 rounded-lg object-cover border border-border/50 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                {item.variationName && (
                  <p className="text-xs text-muted-foreground">{item.variationName}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variationId, item.quantity - 1)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <MinusIcon className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <span className="font-semibold text-sm shrink-0">₪{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Coupon */}
        <div className="border-t border-border pt-3">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-primary/10 px-3 py-2.5 rounded-xl">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{appliedCoupon.code}</span>
                <span className="text-sm text-primary font-semibold">-₪{discount.toFixed(2)}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                placeholder={t("كود الخصم", "קוד הנחה")}
                className="font-mono text-sm rounded-xl h-12"
                dir="ltr"
              />
              <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="shrink-0 rounded-xl h-12">
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تطبيق", "החל")}
              </Button>
            </div>
          )}
          {couponError && <p className="text-destructive text-xs mt-1.5">{couponError}</p>}
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("المجموع الفرعي", "סכום ביניים")}</span>
            <span className="font-medium">₪{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{t("خصم", "הנחה")}</span>
              <span className="font-semibold">-₪{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {shippingMethod === "pickup" ? t("استلام ذاتي", "איסוף עצמי") : t("تكلفة التوصيل", "עלות משלוח")}
            </span>
            <span className={`font-medium ${shippingMethod === "pickup" ? "text-primary" : ""}`}>
              {shippingMethod === null
                ? t("يُحدَّد حسب الاختيار", "ייקבע לפי הבחירה")
                : shippingMethod === "pickup"
                  ? t("مجاناً", "חינם")
                  : `₪${shipping.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-lg font-black pt-3 border-t border-border">
            <span>{t("المجموع", "סה״כ")}</span>
            <span className="text-primary">₪{finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit — desktop */}
        <div className="hidden md:block space-y-3 pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("جاري المعالجة...", "מעבד...")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {selectedPayment === "cash"
                  ? `${t("تأكيد الطلب", "אישור הזמנה")} — ₪${finalTotal.toFixed(2)}`
                  : `${t("ادفع الآن", "שלם עכשיו")} — ₪${finalTotal.toFixed(2)}`}
              </span>
            )}
          </Button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {selectedPayment === "credit" ? t("تشفير SSL — تحويل آمن لصفحة الدفع", "הצפנת SSL — מעבר מאובטח לדף תשלום") : t("تأكيد فوري — الدفع عند الاستلام", "אישור מיידי — תשלום בעת קבלה")}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const selectionCard = (
    selected: boolean,
    htmlFor: string,
    value: string,
    icon: React.ReactNode,
    label: string,
    sub?: string,
  ) => (
    <label
      htmlFor={htmlFor}
      className={`relative flex flex-col items-center gap-2.5 border-2 rounded-2xl p-4 md:p-5 cursor-pointer transition-all active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      <RadioGroupItem value={value} id={htmlFor} className="sr-only" />
      {selected && (
        <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
      {icon}
      <div className="text-center">
        <span className="font-semibold text-sm block">{label}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </label>
  );

  return (
    <div className="bg-muted/30 min-h-screen pb-36 md:pb-12">
      <div className="container py-4 md:py-10 max-w-5xl">
        {/* Logo + Breadcrumb */}
        <div className="flex flex-col items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <img src={logo} alt="الوجهة" className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-md ring-2 ring-primary/20" />
          <span className="text-base md:text-lg font-bold text-foreground">الوجهة</span>
        </div>
        <div className="hidden md:flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={localizedPath("/cart")} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" />
            {t("السلة", "הסל")}
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-foreground font-medium">{t("إتمام الطلب", "השלמת הזמנה")}</span>
        </div>

        <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-8 text-center">{t("إتمام الطلب", "השלמת הזמנה")}</h1>

        {/* Mobile step indicator */}
        <div className="md:hidden flex items-center justify-center gap-1.5 mb-4" dir="rtl">
          {mobileSteps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => s.n < mobileStep && setMobileStep(s.n as 1 | 2 | 3)}
                className="flex items-center gap-1.5"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s.n < mobileStep
                      ? "bg-primary text-primary-foreground"
                      : s.n === mobileStep
                        ? "bg-gold text-gold-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.n < mobileStep ? <Check className="w-3.5 h-3.5" /> : s.n}
                </span>
                <span className={`text-xs ${s.n === mobileStep ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </button>
              {i < mobileSteps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Mobile collapsible order summary strip (steps 1-2) */}
        {mobileStep < 3 && (
          <div className="md:hidden mb-4">
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg border-2 border-card bg-muted overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {totalQty} {t("منتجات", "מוצרים")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-primary">₪{finalTotal.toFixed(2)}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
            {summaryOpen && <div className="mt-2 animate-fade-in">{summaryCard}</div>}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Right Column — Forms */}
            <div className="md:col-span-7 space-y-6 order-2 md:order-1">
              {/* Step 1 (mobile): shipping method + customer info */}
              <div key={`step-${mobileStep === 1 ? 1 : "x"}`} className={`${mobileStep === 1 ? "block" : "hidden"} md:block space-y-6 animate-fade-in`}>
                {/* Shipping Method Card */}
                {(deliveryEnabled && pickupEnabled) && (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Truck className="h-4 w-4 text-primary" />
                      </div>
                      {t("طريقة الاستلام", "אופן קבלת המשלוח")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={shippingMethod ?? ""} onValueChange={(v) => setShippingMethod(v as ShippingMethod)} className="grid grid-cols-2 gap-3">
                      {deliveryEnabled && selectionCard(
                        shippingMethod === "delivery",
                        "sm-delivery",
                        "delivery",
                        <Truck className={`w-8 h-8 ${shippingMethod === "delivery" ? "text-primary" : "text-muted-foreground"}`} />,
                        deliveryLabel,
                        shippingCost() > 0 ? `₪${shippingCost().toFixed(2)}` : undefined,
                      )}
                      {pickupEnabled && selectionCard(
                        shippingMethod === "pickup",
                        "sm-pickup",
                        "pickup",
                        <Package className={`w-8 h-8 ${shippingMethod === "pickup" ? "text-primary" : "text-muted-foreground"}`} />,
                        pickupLabel,
                        t("مجاناً", "חינם"),
                      )}
                    </RadioGroup>
                    {shippingMethod === "pickup" && pickupNote && (
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        {pickupNote}
                      </p>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Customer / Shipping Info Card */}
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {shippingMethod === "delivery" ? <MapPin className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                      </div>
                      {shippingMethod === "delivery" ? t("معلومات التوصيل", "פרטי משלוח") : t("معلومات الزبون", "פרטי לקוח")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("الاسم الكامل *", "שם מלא *")}</Label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="name" name="name" required autoComplete="name" className="pr-10 rounded-xl h-12 text-base" placeholder={t("أدخل اسمك الكامل", "הזן שם מלא")} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("رقم الهاتف *", "מספר טלפון *")}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            autoComplete="tel"
                            inputMode="tel"
                            className={`pl-10 ${otpVerified ? "pr-10" : ""} rounded-xl h-12 text-base`}
                            placeholder="05X-XXX-XXXX"
                            dir="ltr"
                            onBlur={handlePhoneBlur}
                          />
                          {otpVerified && (
                            <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                          )}
                        </div>
                        {selectedPayment === "cash" && otpSent && !otpVerified && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline mt-1"
                            onClick={() => setOtpDialogOpen(true)}
                          >
                            {t("أدخل رمز التحقق", "הזן קוד אימות")}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t("البريد الإلكتروني", "אימייל")}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" name="email" type="text" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="pl-10 rounded-xl h-12 text-base" placeholder="email@example.com" dir="ltr" onBlur={handleIdentityBlur} onChange={() => emailError && setEmailError("")} />
                      </div>
                      {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                    </div>
                    {shippingMethod === "delivery" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">{t("المدينة *", "עיר *")}</Label>
                          <div className="relative">
                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="city" name="city" required autoComplete="address-level2" className="pr-10 rounded-xl h-12 text-base" placeholder={t("المدينة", "עיר")} onChange={() => geoError && setGeoError("")} />
                          </div>
                          {geoError && (
                            <p className="text-destructive text-xs mt-1">{geoError}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">{t("العنوان التفصيلي *", "כתובת מפורטת *")}</Label>
                          <div className="relative">
                            <Home className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="address" name="address" required autoComplete="street-address" className="pr-10 rounded-xl h-12 text-base" placeholder={t("الشارع، رقم البيت", "רחוב, מספר בית")} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="notes">{t("ملاحظات", "הערות")}</Label>
                      <div className="relative">
                        <MessageSquare className="absolute right-3 top-3.5 w-4 h-4 text-muted-foreground" />
                        <Input id="notes" name="notes" className="pr-10 rounded-xl h-12 text-base" placeholder={t("ملاحظات إضافية (اختياري)", "הערות נוספות (אופציונלי)")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 2 (mobile): payment method */}
              <div className={`${mobileStep === 2 ? "block animate-fade-in" : "hidden"} md:block`}>
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      {t("طريقة الدفع", "אופן תשלום")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RadioGroup value={selectedPayment ?? ""} onValueChange={(v) => setSelectedPayment(v as PaymentMethodType)} className="grid grid-cols-2 gap-3">
                      {paymentSettings.cash.enabled && selectionCard(
                        selectedPayment === "cash",
                        "pm-cash",
                        "cash",
                        <Banknote className={`w-8 h-8 ${selectedPayment === "cash" ? "text-primary" : "text-muted-foreground"}`} />,
                        t(paymentSettings.cash.label, "תשלום במזומן במסירה"),
                      )}
                      {paymentSettings.credit.enabled && selectionCard(
                        selectedPayment === "credit",
                        "pm-credit",
                        "credit",
                        <CreditCard className={`w-8 h-8 ${selectedPayment === "credit" ? "text-primary" : "text-muted-foreground"}`} />,
                        t(paymentSettings.credit.label, "כרטיס אשראי"),
                      )}
                    </RadioGroup>
                    {selectedPayment === "credit" && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-xl py-2.5 px-3 animate-fade-in">
                        <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                        {t("تشفير SSL — تحويل آمن لصفحة الدفع", "הצפנת SSL — מעבר מאובטח לדף תשלום")}
                      </div>
                    )}
                    {selectedPayment === "cash" && (
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-xl py-2.5 px-3 animate-fade-in text-center">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                        {t("الدفع للمندوب عند الاستلام — سنرسل رمز تحقق لهاتفك", "תשלום לשליח בעת הקבלה — נשלח קוד אימות לטלפון")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Step 3 (mobile only): review & confirm */}
              <div className={`${mobileStep === 3 ? "block animate-fade-in" : "hidden"} md:hidden space-y-4`}>
                {summaryCard}
              </div>
            </div>

            {/* Left Column — Order Summary (sticky, desktop only) */}
            <div className="hidden md:block md:col-span-5 order-1 md:order-2">
              <div className="md:sticky md:top-24">
                {summaryCard}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-14 inset-x-0 bg-card border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t("المجموع", "סה״כ")}</span>
          <span className="text-lg font-black text-primary">₪{finalTotal.toFixed(2)}</span>
        </div>
        {mobileStep < 3 ? (
          <Button
            type="button"
            size="lg"
            className="w-full h-14 bg-gold text-gold-foreground hover:bg-gold/90 font-bold rounded-xl shadow-lg text-base"
            onClick={goNext}
          >
            <span className="flex items-center gap-2">
              {t("متابعة", "המשך")}
              <ChevronLeft className="w-5 h-5" />
            </span>
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full h-14 bg-gold text-gold-foreground hover:bg-gold/90 font-bold rounded-xl shadow-lg text-base"
            disabled={loading}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("جاري المعالجة...", "מעבד...")}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {selectedPayment === "cash" ? t("تأكيد الطلب", "אישור הזמנה") : t("ادفع الآن", "שלם עכשיו")}
              </span>
            )}
          </Button>
        )}
        <div className="flex items-center justify-center gap-3 mt-2">
          {mobileStep > 1 && (
            <button type="button" onClick={goBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {t("→ رجوع", "חזרה ←")}
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            {t("الدفع آمن", "תשלום מאובטח")}
          </div>
        </div>
      </div>

      {/* OTP Verification Dialog */}
      {otpDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[200] bg-foreground/50 flex items-start sm:items-center justify-center p-4 pt-[12vh] sm:pt-4 overflow-y-auto"
        >
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border space-y-4">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 text-xs">
              {[
                t("إرسال الرمز", "שליחת קוד"),
                t("إدخال الرمز", "הזנת קוד"),
                t("إتمام الطلب", "השלמת הזמנה"),
              ].map((label, i) => {
                const current = otpStep === "sending" || otpStep === "send_failed" ? 0 : 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span className={i === current ? "font-semibold" : "text-muted-foreground"}>{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg">{t("تأكيد رقم الهاتف", "אימות מספר טלפון")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {otpStep === "sending"
                  ? t("جارٍ إرسال الرمز إلى", "שולחים קוד אל")
                  : otpStep === "send_failed"
                    ? t("لم يتم إرسال الرمز إلى", "הקוד לא נשלח אל")
                    : t("أدخل الرمز المكون من 4 أرقام الذي أُرسل إلى", "הזן את הקוד בן 4 הספרות שנשלח אל")}{" "}
                <span dir="ltr" className="font-semibold text-foreground">{otpPhone}</span>
              </p>
            </div>

            {otpStep === "sending" ? (
              <div className="flex justify-center py-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : otpStep === "send_failed" ? (
              <Button type="button" className="w-full rounded-xl" onClick={() => sendOtp(otpPhone)}>
                {t("حاول مرة أخرى", "נסה שוב")}
              </Button>
            ) : (
              <Input
                value={otpCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setOtpCode(v);
                  setOtpError("");
                  if (v.length === 4) verifyOtp(v);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verifyOtp(); } }}
                placeholder="____"
                className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl"
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={4}
                disabled={otpStep === "verifying"}
                autoFocus
              />
            )}

            {otpError && <p className="text-destructive text-sm text-center">{otpError}</p>}

            {otpStep !== "sending" && otpStep !== "send_failed" && (
              <Button
                type="button"
                className="w-full rounded-xl bg-gold text-gold-foreground hover:bg-gold/90"
                disabled={otpCode.length < 4 || otpLoading}
                onClick={() => verifyOtp()}
              >
                {otpStep === "verifying"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("جارٍ التحقق...", "מאמת...")}</>
                  : t("تحقق وأكمل الطلب", "אמת והשלם הזמנה")}
              </Button>
            )}

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setOtpDialogOpen(false)}
              >
                {t("تعديل رقم الهاتف", "שינוי מספר טלפון")}
              </button>
              {otpStep === "enter" && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  onClick={() => sendOtp(otpPhone)}
                  disabled={otpLoading || resendIn > 0}
                >
                  {resendIn > 0
                    ? t(`إعادة الإرسال بعد ${resendIn} ث`, `שליחה חוזרת בעוד ${resendIn} שנ׳`)
                    : t("إعادة إرسال الرمز", "שלח קוד מחדש")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

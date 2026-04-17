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
import { validateCoupon, calcDiscount, incrementCouponUsage, Coupon } from "@/hooks/useCoupons";
import { Loader2, Tag, X, CreditCard, Banknote, MapPin, User, Phone, Mail, Home, MessageSquare, ShieldCheck, Lock, ChevronLeft, ShoppingBag, Package, Truck } from "lucide-react";
import { fbq } from "@/lib/meta-pixel";
import { useSiteSection } from "@/hooks/useSiteContent";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/hooks/useLanguage";
import logo from "@/assets/logo.webp";

const HYP_ORDER_KEY = "hyp_pending_order";
interface HypPendingOrder {
  order_id: string;
  order_number: number;
  total: number;
  started_at: number;
}

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
  const [geoError, setGeoError] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const submittedRef = useRef(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  const sendOtp = async (phone: string) => {
    if (!phone || phone.replace(/[\s\-()]/g, "").length < 9) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", phone },
      });
      if (error) throw error;
      if (data?.error) { setOtpError(data.error); setOtpLoading(false); return; }
      setOtpSent(true);
      setOtpPhone(phone);
      setOtpDialogOpen(true);
    } catch (err) {
      console.error("OTP send error:", err);
      setOtpError(t("حدث خطأ في إرسال الرمز", "שגיאה בשליחת הקוד"));
    }
    setOtpLoading(false);
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", phone: otpPhone, code: otpCode },
      });
      if (error) throw error;
      if (data?.valid) {
        setOtpVerified(true);
        setOtpDialogOpen(false);
        toast.success(t("تم التحقق بنجاح", "האימות הצליח"));
      } else {
        setOtpError(data?.error || t("رمز غير صحيح", "קוד שגוי"));
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setOtpError(t("حدث خطأ في التحقق", "שגיאה באימות"));
    }
    setOtpLoading(false);
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value.trim();
    if (phone && phone.replace(/[\s\-()]/g, "").length >= 9 && !otpVerified) {
      // Reset if phone changed
      if (phone !== otpPhone) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode("");
      }
      if (!otpSent || phone !== otpPhone) {
        sendOtp(phone);
      }
    }
  };

  const { data: paymentSettingsRow } = useSiteSection("settings", "payment_methods");
  const { data: shippingSettingsRow } = useSiteSection("settings", "shipping_methods");
  const { t } = useLanguage();

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

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("credit");
  const defaultShipping = deliveryEnabled ? "delivery" : "pickup";
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(defaultShipping);

  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.includes(selectedPayment)) {
      setSelectedPayment(enabledMethods[0]);
    }
  }, [paymentSettingsRow]);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    // Meta Pixel: InitiateCheckout - send only product SKUs (catalog IDs)
    const skuIds = items.map((i) => i.catalogId).filter(Boolean) as string[];
    if (skuIds.length > 0) {
      fbq("InitiateCheckout", {
        content_ids: skuIds,
        num_items: items.length,
        value: totalPrice(),
        currency: "ILS",
      });
    }
  }, []);

  const subtotal = totalPrice();
  const shipping = shippingMethod === "pickup" ? 0 : shippingCost();
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("السلة فارغة"); return; }
    if (!otpVerified) {
      toast.error(t("يرجى التحقق من رقم الهاتف أولاً", "יש לאמת את מספר הטלפון קודם"));
      return;
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
    const customerEmail = (form.get("email") as string) || "";
    const isCash = selectedPayment === "cash";

    try {
      const uniqueCartVariationIds = Array.from(new Set(items.map((item) => item.variationId)));
      const { data: matchedVariations, error: matchedVariationsError } = await supabase
        .from("product_variations")
        .select("id, product_id")
        .in("id", uniqueCartVariationIds);

      if (matchedVariationsError) throw matchedVariationsError;

      const matchedVariationIds = new Set((matchedVariations || []).map((variation) => variation.id));
      const fallbackProductIds = Array.from(
        new Set(items.filter((item) => !matchedVariationIds.has(item.variationId)).map((item) => item.productId))
      );

      let fallbackVariations: { id: string; product_id: string }[] = [];
      if (fallbackProductIds.length > 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("product_variations")
          .select("id, product_id")
          .in("product_id", fallbackProductIds)
          .order("created_at", { ascending: true });

        if (fallbackError) throw fallbackError;
        fallbackVariations = (fallbackData || []) as { id: string; product_id: string }[];
      }

      const fallbackByProductId = new Map<string, string>();
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

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          source: "website" as const,
          status: isCash ? ("pending" as const) : ("pending_payment" as const),
          payment_method: isCash ? "cash" : "credit",
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          shipping_city: shippingMethod === "delivery" ? (form.get("city") as string) : "איסוף עצמי",
          shipping_address: shippingMethod === "delivery" ? (form.get("address") as string) : "",
          shipping_cost: shipping,
          discount_amount: discount,
          discount_type: appliedCoupon ? appliedCoupon.type : null,
          discount_value: appliedCoupon ? Number(appliedCoupon.value) : 0,
          notes: [
            shippingMethod === "pickup" ? "🏪 איסוף עצמי" : "",
            (form.get("notes") as string) || "",
            appliedCoupon ? `קופון: ${appliedCoupon.code} (הנחה: ₪${discount.toFixed(2)})` : "",
          ].filter(Boolean).join(" | ") || null,
          total: finalTotal,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = normalizedItems.map((item) => ({
        order_id: order.id,
        variation_id: item.orderVariationId!,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        ...(item.bundleVariationId ? { bundle_variation_id: item.bundleVariationId } : {}),
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      if (appliedCoupon) await incrementCouponUsage(appliedCoupon.id);

      if (isCash) {
        // Trigger SMS for new order
        supabase.functions.invoke("order-sms-trigger", {
          body: { order_id: order.id, trigger_type: "order_created" },
        }).catch(console.error);
        // Trigger email notification
        supabase.functions.invoke("order-email-notify", {
          body: { order_id: order.id },
        }).catch(console.error);
        submittedRef.current = true;
        navigate(`/order-confirmation/${order.order_number}`);
        clearCart();
        return;
      }

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

      if (hypError || !hypData?.success || !hypData?.payment_url) {
        console.error("HYP payment error:", hypError || hypData?.error);
        toast.error(t("تعذّر فتح صفحة الدفع — تم حفظ الطلب وسيتواصل معك فريقنا", "תקלה בפתיחת דף תשלום — ההזמנה נשמרה, נציג יצור קשר"));
        submittedRef.current = true;
        navigate(`/order-confirmation/${order.order_number}?payment=pending`);
        clearCart();
        return;
      }

      // Persist a pending-order snapshot so the confirmation page can resolve it
      // even if the user opens the return URL in a different tab.
      const snapshot: HypPendingOrder = {
        order_id: order.id,
        order_number: Number(order.order_number),
        total: finalTotal,
        started_at: Date.now(),
      };
      try {
        sessionStorage.setItem(HYP_ORDER_KEY, JSON.stringify(snapshot));
        localStorage.setItem(HYP_ORDER_KEY, JSON.stringify(snapshot));
      } catch {
        // storage may be unavailable (private mode etc.) — confirmation page has a DB fallback
      }

      submittedRef.current = true;
      setRedirecting(true);
      // Direct top-level redirect to HYP (no iframe: avoids X-Frame-Options,
      // 3DS popups being blocked, and lost postMessage edge cases).
      window.location.href = hypData.payment_url;
    } catch (err) {
      console.error(err);
      toast.error(t("حدث خطأ أثناء إرسال الطلب", "שגיאה בשליחת ההזמנה"));
      setLoading(false);
    }
  };

  if (items.length === 0 && !redirecting && !submittedRef.current) {
    navigate("/cart");
    return null;
  }

  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-sm w-full bg-card rounded-2xl shadow-lg border border-border p-8 text-center space-y-4">
          <img src={logo} alt="الوجهة" className="w-16 h-16 rounded-full mx-auto ring-2 ring-primary/20" />
          <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
          <h2 className="text-lg font-bold text-foreground">
            {t("جاري التحويل إلى صفحة الدفع", "מעביר לדף התשלום המאובטח")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("يرجى عدم إغلاق الصفحة", "אנא אל תסגור את הדף")}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" />
            {t("دفع آمن عبر Hypay", "תשלום מאובטח באמצעות Hypay")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen pb-32 md:pb-12">
      <div className="container py-6 md:py-10 max-w-5xl">
        {/* Logo + Breadcrumb */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={logo} alt="الوجهة" className="w-16 h-16 rounded-full shadow-md ring-2 ring-primary/20" />
          <span className="text-lg font-bold text-foreground">الوجهة</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/cart" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" />
            {t("السلة", "הסל")}
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-foreground font-medium">{t("إتمام الطلب", "השלמת הזמנה")}</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">{t("إتمام الطلب", "השלמת הזמנה")}</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Right Column — Forms */}
            <div className="md:col-span-7 space-y-6 order-2 md:order-1">
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
                  <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as ShippingMethod)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deliveryEnabled && (
                      <label
                        htmlFor="sm-delivery"
                        className={`flex flex-col items-center gap-3 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          shippingMethod === "delivery"
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem value="delivery" id="sm-delivery" className="sr-only" />
                        <Truck className={`w-8 h-8 ${shippingMethod === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-center">
                          <span className="font-semibold text-sm block">{deliveryLabel}</span>
                          {shippingCost() > 0 && (
                            <span className="text-xs text-muted-foreground">₪{shippingCost().toFixed(2)}</span>
                          )}
                        </div>
                      </label>
                    )}
                    {pickupEnabled && (
                      <label
                        htmlFor="sm-pickup"
                        className={`flex flex-col items-center gap-3 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          shippingMethod === "pickup"
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem value="pickup" id="sm-pickup" className="sr-only" />
                        <Package className={`w-8 h-8 ${shippingMethod === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-center">
                          <span className="font-semibold text-sm block">{pickupLabel}</span>
                          <span className="text-xs text-muted-foreground">{t("مجاناً", "חינם")}</span>
                        </div>
                      </label>
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
                        <Input id="name" name="name" required className="pr-10 rounded-xl" placeholder={t("أدخل اسمك الكامل", "הזן שם מלא")} />
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
                          className={`pl-10 ${otpVerified ? "pr-10" : ""} rounded-xl`}
                          placeholder="05X-XXX-XXXX"
                          dir="ltr"
                          onBlur={handlePhoneBlur}
                        />
                        {otpVerified && (
                          <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                        )}
                      </div>
                      {otpSent && !otpVerified && (
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
                      <Input id="email" name="email" type="email" className="pl-10 rounded-xl" placeholder="email@example.com" dir="ltr" />
                    </div>
                  </div>
                  {shippingMethod === "delivery" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">{t("المدينة *", "עיר *")}</Label>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="city" name="city" required className="pr-10 rounded-xl" placeholder={t("المدينة", "עיר")} onChange={() => geoError && setGeoError("")} />
                        </div>
                        {geoError && (
                          <p className="text-destructive text-xs mt-1">{geoError}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">{t("العنوان التفصيلي *", "כתובת מפורטת *")}</Label>
                        <div className="relative">
                          <Home className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="address" name="address" required className="pr-10 rounded-xl" placeholder={t("الشارع، رقم البيت", "רחוב, מספר בית")} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("ملاحظات", "הערות")}</Label>
                    <div className="relative">
                      <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="notes" name="notes" className="pr-10 rounded-xl" placeholder={t("ملاحظات إضافية (اختياري)", "הערות נוספות (אופציונלי)")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Card */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    {t("طريقة الدفع", "אופן תשלום")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedPayment} onValueChange={(v) => setSelectedPayment(v as PaymentMethodType)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentSettings.cash.enabled && (
                      <label
                        htmlFor="pm-cash"
                        className={`flex flex-col items-center gap-3 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          selectedPayment === "cash"
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem value="cash" id="pm-cash" className="sr-only" />
                        <Banknote className={`w-8 h-8 ${selectedPayment === "cash" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">{paymentSettings.cash.label}</span>
                      </label>
                    )}
                    {paymentSettings.credit.enabled && (
                      <label
                        htmlFor="pm-credit"
                        className={`flex flex-col items-center gap-3 border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          selectedPayment === "credit"
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <RadioGroupItem value="credit" id="pm-credit" className="sr-only" />
                        <CreditCard className={`w-8 h-8 ${selectedPayment === "credit" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold text-sm">{paymentSettings.credit.label}</span>
                      </label>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Left Column — Order Summary (sticky) */}
            <div className="md:col-span-5 order-1 md:order-2">
              <div className="md:sticky md:top-24">
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
                                className="p-0.5 rounded hover:bg-muted transition-colors"
                              >
                                <MinusIcon className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                                className="p-0.5 rounded hover:bg-muted transition-colors"
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
                            className="font-mono text-sm rounded-xl"
                            dir="ltr"
                          />
                          <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="shrink-0 rounded-xl">
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
                          {shippingMethod === "pickup" ? t("مجاناً", "חינם") : `₪${shipping.toFixed(2)}`}
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
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-14 inset-x-0 bg-card border-t border-border p-4 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t("المجموع", "סה״כ")}</span>
          <span className="text-lg font-black text-primary">₪{finalTotal.toFixed(2)}</span>
        </div>
        <Button
          type="submit"
          form=""
          size="lg"
          className="w-full h-14 bg-gold text-gold-foreground hover:bg-gold/90 font-bold rounded-xl shadow-lg text-base"
          disabled={loading}
          onClick={() => {
            const form = document.querySelector("form");
            if (form) form.requestSubmit();
          }}
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
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          {t("الدفع آمن", "תשלום מאובטח")}
        </div>
      </div>

      {/* OTP Verification Dialog */}
      {otpDialogOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border space-y-4">
            <div className="text-center">
              <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
              <h3 className="font-bold text-lg">{t("رمز التحقق", "קוד אימות")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("تم إرسال رمز التحقق إلى", "קוד אימות נשלח אל")} {otpPhone}
              </p>
            </div>
            <Input
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setOtpError(""); }}
              placeholder="____"
              className="text-center text-2xl tracking-[0.5em] font-mono rounded-xl"
              dir="ltr"
              maxLength={4}
              autoFocus
            />
            {otpError && <p className="text-destructive text-xs text-center">{otpError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setOtpDialogOpen(false)}
              >
                {t("إلغاء", "ביטול")}
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl bg-gold text-gold-foreground hover:bg-gold/90"
                disabled={otpCode.length < 4 || otpLoading}
                onClick={verifyOtp}
              >
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تحقق", "אמת")}
              </Button>
            </div>
            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={() => sendOtp(otpPhone)}
              disabled={otpLoading}
            >
              {t("إعادة إرسال الرمز", "שלח קוד מחדש")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

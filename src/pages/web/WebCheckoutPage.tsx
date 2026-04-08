import { useCartStore } from "@/lib/web-cart-store";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
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
  const { items, totalPrice, clearCart, shippingCost } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hypPaymentUrl, setHypPaymentUrl] = useState<string | null>(null);

  const { data: paymentSettingsRow } = useSiteSection("settings", "payment_methods");
  const paymentSettings: PaymentSettings = paymentSettingsRow?.content
    ? { ...DEFAULT_PAYMENT_SETTINGS, ...(paymentSettingsRow.content as unknown as PaymentSettings) }
    : DEFAULT_PAYMENT_SETTINGS;

  const enabledMethods: PaymentMethodType[] = [];
  if (paymentSettings.cash.enabled) enabledMethods.push("cash");
  if (paymentSettings.credit.enabled) enabledMethods.push("credit");

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("credit");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("delivery");

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
    fbq("InitiateCheckout", {
      content_ids: items.map((i) => i.variationId),
      num_items: items.length,
      value: totalPrice(),
      currency: "ILS",
    });
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
          shipping_city: form.get("city") as string,
          shipping_address: form.get("address") as string,
          notes: [
            shippingMethod === "pickup" ? "🏪 איסוף עצמי" : "",
            (form.get("notes") as string) || "",
            appliedCoupon ? `קופון: ${appliedCoupon.code} (הנחה: ₪${discount.toFixed(2)})` : "",
          ].filter(Boolean).join(" | ") || null,
          shipping_city: shippingMethod === "delivery" ? (form.get("city") as string) : "איסוף עצמי",
          shipping_address: shippingMethod === "delivery" ? (form.get("address") as string) : "",
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
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      if (appliedCoupon) await incrementCouponUsage(appliedCoupon.id);

      if (isCash) {
        clearCart();
        navigate(`/web/order-confirmation/${order.order_number}`);
        return;
      }

      const successUrl = `${window.location.origin}/web/order-confirmation/${order.order_number}`;
      const errorUrl = `${window.location.origin}/web/checkout?payment_error=true`;

      const { data: hypData, error: hypError } = await supabase.functions.invoke("hyp-create-payment", {
        body: {
          order_id: order.id,
          order_number: order.order_number,
          total: finalTotal,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          success_url: successUrl,
          error_url: errorUrl,
          info: `הזמנה #${order.order_number}`,
        },
      });

      if (hypError || !hypData?.success) {
        console.error("HYP payment error:", hypError || hypData?.error);
        toast.error("שגיאה ביצירת דף תשלום — ההזמנה נשמרה ונציג יצור קשר");
        clearCart();
        navigate(`/web/order-confirmation/${order.order_number}?payment=pending`);
        return;
      }

      sessionStorage.setItem("hyp_order_id", order.id);
      sessionStorage.setItem("hyp_order_number", String(order.order_number));
      setHypPaymentUrl(hypData.payment_url);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !hypPaymentUrl) {
    navigate("/web/cart");
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
              navigate("/web/cart");
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

  return (
    <div className="bg-muted/30 min-h-screen pb-32 md:pb-12">
      <div className="container py-6 md:py-10 max-w-5xl">
        {/* Logo + Breadcrumb */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src={logo} alt="الوجهة" className="w-16 h-16 rounded-full shadow-md ring-2 ring-primary/20" />
          <span className="text-lg font-bold text-foreground">الوجهة</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/web/cart" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" />
            السلة
          </Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-foreground font-medium">إتمام الطلب</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">إتمام الطلب</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Right Column — Forms */}
            <div className="md:col-span-7 space-y-6 order-2 md:order-1">
              {/* Shipping Method Card */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Truck className="h-4 w-4 text-primary" />
                    </div>
                    طريقة الاستلام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={shippingMethod} onValueChange={(v) => setShippingMethod(v as ShippingMethod)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <span className="font-semibold text-sm block">توصيل للبيت</span>
                        {shippingCost() > 0 && (
                          <span className="text-xs text-muted-foreground">₪{shippingCost().toFixed(2)}</span>
                        )}
                      </div>
                    </label>
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
                        <span className="font-semibold text-sm block">איסוף עצמי</span>
                        <span className="text-xs text-muted-foreground">חינם</span>
                      </div>
                    </label>
                  </RadioGroup>
                  {shippingMethod === "pickup" && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      نعمل أونلاين — يرجى التنسيق معنا مسبقاً لموعد الاستلام
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Customer / Shipping Info Card */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {shippingMethod === "delivery" ? <MapPin className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                    </div>
                    {shippingMethod === "delivery" ? "معلومات التوصيل" : "معلومات الزبون"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم الكامل *</Label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="name" name="name" required className="pr-10 rounded-xl" placeholder="أدخل اسمك الكامل" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="phone" name="phone" type="tel" required className="pl-10 rounded-xl" placeholder="05X-XXX-XXXX" dir="ltr" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" name="email" type="email" className="pl-10 rounded-xl" placeholder="email@example.com" dir="ltr" />
                    </div>
                  </div>
                  {shippingMethod === "delivery" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">المدينة *</Label>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="city" name="city" required className="pr-10 rounded-xl" placeholder="المدينة" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">العنوان التفصيلي *</Label>
                        <div className="relative">
                          <Home className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="address" name="address" required className="pr-10 rounded-xl" placeholder="الشارع، رقم البيت" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات</Label>
                    <div className="relative">
                      <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="notes" name="notes" className="pr-10 rounded-xl" placeholder="ملاحظات إضافية (اختياري)" />
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
                    طريقة الدفع
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
                      ملخص الطلب ({items.length} منتج)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
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
                            <p className="text-xs text-muted-foreground">× {item.quantity}</p>
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
                            placeholder="كود الخصم"
                            className="font-mono text-sm rounded-xl"
                            dir="ltr"
                          />
                          <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="shrink-0 rounded-xl">
                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
                          </Button>
                        </div>
                      )}
                      {couponError && <p className="text-destructive text-xs mt-1.5">{couponError}</p>}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-border pt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المجموع الفرعي</span>
                        <span className="font-medium">₪{subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>خصم</span>
                          <span className="font-semibold">-₪{discount.toFixed(2)}</span>
                        </div>
                      )}
                      {shipping > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تكلفة التوصيل</span>
                          <span className="font-medium">₪{shipping.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-black pt-3 border-t border-border">
                        <span>المجموع</span>
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
                            جاري المعالجة...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            {selectedPayment === "cash"
                              ? `تأكيد الطلب — ₪${finalTotal.toFixed(2)}`
                              : `ادفع الآن — ₪${finalTotal.toFixed(2)}`}
                          </span>
                        )}
                      </Button>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        {selectedPayment === "credit" ? "تشفير SSL — تحويل آمن لصفحة الدفع" : "تأكيد فوري — الدفع عند الاستلام"}
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
      <div className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-4 md:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">المجموع</span>
          <span className="text-lg font-black text-primary">₪{finalTotal.toFixed(2)}</span>
        </div>
        <Button
          type="submit"
          form=""
          size="lg"
          className="w-full h-12 bg-gold text-gold-foreground hover:bg-gold/90 font-bold rounded-xl shadow-lg"
          disabled={loading}
          onClick={() => {
            const form = document.querySelector("form");
            if (form) form.requestSubmit();
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري المعالجة...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {selectedPayment === "cash" ? "تأكيد الطلب" : "ادفع الآن"}
            </span>
          )}
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          تشلום مאובטח
        </div>
      </div>
    </div>
  );
}

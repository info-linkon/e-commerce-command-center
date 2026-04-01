import { useCartStore } from "@/lib/web-cart-store";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateCoupon, calcDiscount, incrementCouponUsage, Coupon } from "@/hooks/useCoupons";
import { Loader2, Tag, X, CreditCard, Banknote } from "lucide-react";
import { fbq } from "@/lib/meta-pixel";
import { useSiteSection } from "@/hooks/useSiteContent";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  // Payment method
  const { data: paymentSettingsRow } = useSiteSection("settings", "payment_methods");
  const paymentSettings: PaymentSettings = paymentSettingsRow?.content
    ? { ...DEFAULT_PAYMENT_SETTINGS, ...(paymentSettingsRow.content as unknown as PaymentSettings) }
    : DEFAULT_PAYMENT_SETTINGS;

  const enabledMethods: PaymentMethodType[] = [];
  if (paymentSettings.cash.enabled) enabledMethods.push("cash");
  if (paymentSettings.credit.enabled) enabledMethods.push("credit");

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("credit");

  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.includes(selectedPayment)) {
      setSelectedPayment(enabledMethods[0]);
    }
  }, [paymentSettingsRow]);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Meta Pixel: InitiateCheckout
  useEffect(() => {
    fbq("InitiateCheckout", {
      content_ids: items.map((i) => i.variationId),
      num_items: items.length,
      value: totalPrice(),
      currency: "ILS",
    });
  }, []);

  const subtotal = totalPrice();
  const shipping = shippingCost();
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
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const customerName = form.get("name") as string;
    const customerPhone = form.get("phone") as string;
    const customerEmail = (form.get("email") as string) || "";

    const isCash = selectedPayment === "cash";

    try {
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
            (form.get("notes") as string) || "",
            appliedCoupon ? `קופון: ${appliedCoupon.code} (הנחה: ₪${discount.toFixed(2)})` : "",
          ].filter(Boolean).join(" | ") || null,
          total: finalTotal,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        variation_id: item.variationId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      if (appliedCoupon) {
        await incrementCouponUsage(appliedCoupon.id);
      }

      // Cash flow — redirect directly
      if (isCash) {
        clearCart();
        navigate(`/web/order-confirmation/${order.order_number}`);
        return;
      }

      // Credit flow — HYP
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
      clearCart();
      window.location.href = hypData.payment_url;
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate("/web/cart");
    return null;
  }

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-8">إتمام الطلب</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="font-bold text-lg">معلومات التوصيل</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input id="name" name="name" required className="mt-1" placeholder="أدخل اسمك الكامل" />
              </div>
              <div>
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input id="phone" name="phone" type="tel" required className="mt-1" placeholder="05X-XXX-XXXX" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" name="email" type="email" className="mt-1" placeholder="email@example.com" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="city">المدينة *</Label>
                <Input id="city" name="city" required className="mt-1" placeholder="المدينة" />
              </div>
              <div>
                <Label htmlFor="address">العنوان التفصيلي *</Label>
                <Input id="address" name="address" required className="mt-1" placeholder="الشارع، رقم البيت، الطابق" />
              </div>
              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Input id="notes" name="notes" className="mt-1" placeholder="ملاحظات إضافية" />
              </div>
            </div>

            {/* Payment Method Selection */}
            {enabledMethods.length > 1 && (
              <div className="space-y-3">
                <h2 className="font-bold text-lg">طريقة الدفع</h2>
                <RadioGroup value={selectedPayment} onValueChange={(v) => setSelectedPayment(v as PaymentMethodType)} className="space-y-2">
                  {paymentSettings.cash.enabled && (
                    <label htmlFor="pm-cash" className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${selectedPayment === "cash" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="cash" id="pm-cash" />
                      <Banknote className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{paymentSettings.cash.label}</span>
                    </label>
                  )}
                  {paymentSettings.credit.enabled && (
                    <label htmlFor="pm-credit" className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${selectedPayment === "credit" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="credit" id="pm-credit" />
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{paymentSettings.credit.label}</span>
                    </label>
                  )}
                </RadioGroup>
              </div>
            )}
          </div>

          <div className="bg-card p-6 rounded-xl border border-border h-fit">
            <h2 className="font-bold text-lg mb-4">ملخص الطلب</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.variationId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate ml-4">
                    {item.productName} {item.variationName && `(${item.variationName})`} × {item.quantity}
                  </span>
                  <span className="font-medium shrink-0">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Coupon Section */}
            <div className="border-t border-border pt-3 mb-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-primary/10 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{appliedCoupon.code}</span>
                    <span className="text-sm text-primary">-₪{discount.toFixed(2)}</span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    placeholder="كود الخصم"
                    className="font-mono text-sm"
                    dir="ltr"
                  />
                  <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="shrink-0">
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-destructive text-xs mt-1">{couponError}</p>}
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium">₪{subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>خصم</span>
                  <span>-₪{discount.toFixed(2)}</span>
                </div>
              )}
              {shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تكلفة التوصيل</span>
                  <span className="font-medium">₪{shipping.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black pt-2 border-t border-border">
                <span>المجموع</span>
                <span className="text-primary">₪{finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full mt-6 bg-gold text-gold-foreground hover:bg-gold/90 font-bold"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري المعالجة...
                </span>
              ) : selectedPayment === "cash" ? (
                `تأكيد الطلب — ₪${finalTotal.toFixed(2)}`
              ) : (
                `ادفع الآن — ₪${finalTotal.toFixed(2)}`
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {selectedPayment === "credit" ? "سيتم تحويلك لصفحة الدفع الآمنة" : "سيتم تأكيد طلبك والدفع عند الاستلام"}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

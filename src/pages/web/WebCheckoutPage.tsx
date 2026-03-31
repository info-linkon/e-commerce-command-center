import { useCartStore } from "@/lib/web-cart-store";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateCoupon, calcDiscount, incrementCouponUsage, Coupon } from "@/hooks/useCoupons";
import { Loader2, Tag, X } from "lucide-react";
import { fbq } from "@/lib/meta-pixel";
import { useEffect } from "react";

export default function WebCheckoutPage() {
  const { items, totalPrice, clearCart, shippingCost } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

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

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          source: "website" as const,
          status: "pending" as const,
          customer_name: form.get("name") as string,
          customer_phone: form.get("phone") as string,
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

      // Increment coupon usage
      if (appliedCoupon) {
        await incrementCouponUsage(appliedCoupon.id);
      }

      clearCart();
      toast.success("تم إرسال الطلب بنجاح!");
      navigate(`/web/order-confirmation/${order.order_number}`);
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
              {loading ? "جاري الإرسال..." : `تأكيد الطلب — ₪${finalTotal.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

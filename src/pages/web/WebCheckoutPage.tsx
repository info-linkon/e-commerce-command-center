import { useCartStore } from "@/lib/web-cart-store";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function WebCheckoutPage() {
  const { items, totalPrice, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.city) {
      toast.error("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          source: "website" as const,
          status: "pending" as const,
          customer_name: form.name,
          customer_phone: form.phone,
          shipping_city: form.city,
          shipping_address: form.address,
          notes: form.notes || null,
          total: totalPrice(),
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
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">السلة فارغة</h1>
        <a href="/web/shop" className="text-gold underline">تصفح المنتجات</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">إتمام الطلب</h1>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
          {[
            { label: "الاسم الكامل *", key: "name", type: "text" },
            { label: "رقم الهاتف *", key: "phone", type: "tel", dir: "ltr" },
            { label: "المدينة *", key: "city", type: "text" },
            { label: "العنوان *", key: "address", type: "text" },
          ].map(({ label, key, type, dir }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
              <input
                type={type}
                required
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-gold focus:border-transparent outline-none transition-all"
                dir={dir}
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-gold focus:border-transparent outline-none resize-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 web-gold-gradient text-white rounded-xl font-medium text-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </form>

        {/* Summary */}
        <div className="md:col-span-2">
          <div className="bg-card rounded-xl p-5 sticky top-20 border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">ملخص الطلب</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.variationId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} {item.variationName && `(${item.variationName})`} × {item.quantity}
                  </span>
                  <span className="font-medium">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-bold">المجموع</span>
              <span className="font-bold text-lg text-primary">₪{totalPrice().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

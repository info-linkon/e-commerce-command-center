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
      // Create order
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

      // Create order items
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">السلة فارغة</h1>
        <a href="/web/shop" className="text-[hsl(36,56%,51%)] underline">تصفح المنتجات</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">إتمام الطلب</h1>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدينة *</label>
            <input
              type="text"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[hsl(36,56%,51%)] text-white rounded-xl font-medium text-lg hover:bg-[hsl(36,56%,45%)] transition-colors disabled:opacity-50"
          >
            {loading ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </form>

        {/* Summary */}
        <div className="md:col-span-2">
          <div className="bg-gray-50 rounded-xl p-4 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-4">ملخص الطلب</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.variationId} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.productName} {item.variationName && `(${item.variationName})`} × {item.quantity}
                  </span>
                  <span className="font-medium">₪{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="font-bold">المجموع</span>
              <span className="font-bold text-lg">₪{totalPrice().toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCartStore } from "@/lib/web-cart-store";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";

export default function WebCartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">السلة فارغة</h1>
        <p className="text-gray-500 mb-6">لم تقم بإضافة أي منتجات بعد</p>
        <Link
          to="/web/shop"
          className="inline-block px-8 py-3 bg-[hsl(36,56%,51%)] text-white rounded-full font-medium hover:bg-[hsl(36,56%,45%)] transition-colors"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">سلة التسوق</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.variationId} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{item.productName}</h3>
              {item.variationName && (
                <p className="text-sm text-gray-500">{item.variationName}</p>
              )}
              <p className="text-sm font-bold text-[hsl(30,15%,12%)]">₪{item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.variationId, item.quantity - 1)}
                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <p className="font-bold text-[hsl(30,15%,12%)] w-20 text-left">₪{(item.price * item.quantity).toFixed(2)}</p>
            <button onClick={() => removeItem(item.variationId)} className="text-red-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-medium text-gray-700">المجموع</span>
          <span className="text-2xl font-bold text-[hsl(30,15%,12%)]">₪{totalPrice().toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={clearCart}
            className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            إفراغ السلة
          </button>
          <Link
            to="/web/checkout"
            className="flex-1 py-3 bg-[hsl(36,56%,51%)] text-white rounded-xl font-medium text-center hover:bg-[hsl(36,56%,45%)] transition-colors"
          >
            إتمام الطلب
          </Link>
        </div>
      </div>
    </div>
  );
}

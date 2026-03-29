import { useCartStore } from "@/lib/web-cart-store";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";

export default function WebCartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fade-in">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">السلة فارغة</h1>
        <p className="text-muted-foreground mb-6">لم تقم بإضافة أي منتجات بعد</p>
        <Link
          to="/web/shop"
          className="inline-block px-8 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">سلة التسوق</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.variationId} className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{item.productName}</h3>
              {item.variationName && (
                <p className="text-sm text-muted-foreground">{item.variationName}</p>
              )}
              <p className="text-sm font-bold text-primary">₪{item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.variationId, item.quantity - 1)}
                className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <p className="font-bold text-primary w-20 text-left">₪{(item.price * item.quantity).toFixed(2)}</p>
            <button onClick={() => removeItem(item.variationId)} className="text-destructive/60 hover:text-destructive transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-medium text-muted-foreground">المجموع</span>
          <span className="text-2xl font-bold text-primary">₪{totalPrice().toFixed(2)}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={clearCart}
            className="px-6 py-3 border border-border text-muted-foreground rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
          >
            إفراغ السلة
          </button>
          <Link
            to="/web/checkout"
            className="flex-1 py-3 web-gold-gradient text-white rounded-xl font-medium text-center hover:opacity-90 transition-opacity shadow-md"
          >
            إتمام الطلب
          </Link>
        </div>
      </div>
    </div>
  );
}

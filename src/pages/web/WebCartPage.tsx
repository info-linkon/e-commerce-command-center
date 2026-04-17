import { useCartStore } from "@/lib/web-cart-store";
import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function WebCartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, shippingCost } = useCartStore();
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("السلة فارغة", "הסל ריק")}</h1>
        <p className="text-muted-foreground mb-6">{t("لم تقم بإضافة أي منتجات بعد", "עדיין לא הוספת מוצרים")}</p>
        <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Link to="/shop">{t("تصفح المنتجات", "עיון במוצרים")}</Link>
        </Button>
      </div>
    );
  }

  const shipping = shippingCost();
  const subtotal = totalPrice();
  const total = subtotal + shipping;

  return (
    <div className="container py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold mb-8">{t("سلة التسوق", "סל קניות")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.variationId} className="flex gap-4 bg-card p-4 rounded-xl border border-border">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{item.productName}</h3>
                {item.variationName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.variationName}</p>
                )}
                <p className="text-primary font-bold mt-1">₪{item.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(item.variationId, item.quantity - 1)} className="p-1 hover:bg-muted rounded">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) updateQuantity(item.variationId, v);
                    }}
                    className="w-12 h-7 text-sm font-medium text-center bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                  <button onClick={() => updateQuantity(item.variationId, item.quantity + 1)} className="p-1 hover:bg-muted rounded">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(item.variationId)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm">₪{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card p-4 md:p-6 rounded-xl border border-border h-fit lg:sticky lg:top-24">
          <h2 className="font-bold text-lg mb-4">{t("ملخص الطلب", "סיכום הזמנה")}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("المجموع الفرعي", "סכום ביניים")}</span>
              <span className="font-medium">₪{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("تكلفة التوصيل", "עלות משלוח")}</span>
              <span className={`font-medium ${shipping === 0 ? "text-primary" : ""}`}>
                {shipping === 0 ? t("مجاناً", "חינם") : `₪${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-bold">{t("المجموع", "סה״כ")}</span>
              <span className="font-black text-lg text-primary">₪{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">{t("شامل ض.ق.م", "כולל מע״מ")}</p>
          </div>
          <Button asChild size="lg" className="w-full mt-6 bg-gold text-gold-foreground hover:bg-gold/90 font-bold">
            <Link to="/checkout">{t("إتمام الطلب", "לסיום הזמנה")}</Link>
          </Button>
          <button onClick={clearCart} className="w-full text-sm text-muted-foreground hover:text-destructive mt-3 transition-colors">
            {t("إفراغ السلة", "רוקן סל")}
          </button>
        </div>
      </div>
    </div>
  );
}

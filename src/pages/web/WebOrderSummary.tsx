import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { Package, MapPin, Calendar, CreditCard, Loader2, AlertCircle, CheckCircle, Clock, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const statusConfig: Record<string, { label: string; labelHe: string; icon: React.ElementType; color: string }> = {
  pending: { label: "بانتظار التأكيد", labelHe: "ממתינה לאישור", icon: Clock, color: "bg-amber-100 text-amber-800 border-amber-200" },
  pending_payment: { label: "بانتظار الدفع", labelHe: "ממתינה לתשלום", icon: Clock, color: "bg-amber-100 text-amber-800 border-amber-200" },
  processing: { label: "قيد المعالجة", labelHe: "בטיפול", icon: Package, color: "bg-blue-100 text-blue-800 border-blue-200" },
  picking: { label: "قيد التجهيز", labelHe: "בליקוט", icon: Package, color: "bg-blue-100 text-blue-800 border-blue-200" },
  shipping: { label: "في الطريق", labelHe: "במשלוח", icon: Truck, color: "bg-purple-100 text-purple-800 border-purple-200" },
  completed: { label: "تم التسليم", labelHe: "הושלמה", icon: CheckCircle, color: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "ملغي", labelHe: "בוטלה", icon: AlertCircle, color: "bg-red-100 text-red-800 border-red-200" },
};

export default function WebOrderSummary() {
  const { orderNumber } = useParams();
  const { t, lang } = useLanguage();

  const { data, isLoading, error } = useQuery({
    queryKey: ["order-summary", orderNumber],
    enabled: !!orderNumber,
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-summary?order_number=${orderNumber}`,
        {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">{t("جاري التحميل...", "טוען...")}</p>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("الطلب غير موجود", "ההזמנה לא נמצאה")}</h1>
        <p className="text-muted-foreground">{t("تأكد من رقم الطلب", "בדוק את מספר ההזמנה")}</p>
      </div>
    );
  }

  const { order, items } = data;
  const statusInfo = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const createdDate = new Date(order.created_at);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-4 ${statusInfo.color}`}>
          <StatusIcon className="h-4 w-4" />
          {lang === "he" ? statusInfo.labelHe : statusInfo.label}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-1">
          {t("طلب رقم", "הזמנה מס׳")} #{order.order_number}
        </h1>
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
          <Calendar className="h-4 w-4" />
          {createdDate.toLocaleDateString(lang === "he" ? "he-IL" : "ar-EG", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </p>
      </div>

      {/* Customer & Shipping Info */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.customer_name && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("الاسم", "שם")}</p>
              <p className="font-medium">{order.customer_name}</p>
            </div>
          )}
          {order.payment_method && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("طريقة الدفع", "אמצעי תשלום")}</p>
              <p className="font-medium flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {order.payment_method === "cash" ? t("نقدي", "מזומן") :
                 order.payment_method === "credit" ? t("بطاقة ائتمان", "אשראי") :
                 order.payment_method === "bit" ? "Bit" : order.payment_method}
              </p>
            </div>
          )}
          {(order.shipping_address || order.shipping_city) && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">{t("عنوان التوصيل", "כתובת משלוח")}</p>
              <p className="font-medium flex items-start gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                {[order.shipping_address, order.shipping_city].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("تفاصيل الطلب", "פריטי ההזמנה")}
          </h2>
        </div>
        <div className="divide-y divide-border">
          {items?.map((item: any, i: number) => (
            <div key={i} className="p-4 flex gap-3 items-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover border border-border shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name || t("منتج", "מוצר")}</p>
                {item.variationName && item.variationName !== "ברירת מחדל" && item.variationName !== "Default" && (
                  <p className="text-xs text-muted-foreground">{item.variationName}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.quantity} × ₪{Number(item.unitPrice).toFixed(2)}
                </p>
              </div>
              <span className="font-bold text-sm shrink-0">₪{Number(item.totalPrice).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-card border border-border rounded-xl p-5">
        {(() => {
          const subtotal = (items || []).reduce((sum: number, it: any) => sum + Number(it.totalPrice || 0), 0);
          const shipping = Number(order.shipping_cost || 0);
          const discount = Number(order.discount_amount || 0);
          return (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t("المجموع الفرعي", "סכום ביניים")}</span>
                <span>₪{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t("الشحن", "משלוח")}</span>
                <span>{shipping > 0 ? `₪${shipping.toFixed(2)}` : t("مجاني", "חינם")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t("خصم", "הנחה")}</span>
                  <span className="text-green-600">-₪{discount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{t("المجموع", "סה״כ")}</span>
                <span className="font-bold text-xl text-primary">₪{Number(order.total).toFixed(2)}</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 mt-4">
          <p className="text-xs text-muted-foreground mb-1">{t("ملاحظات", "הערות")}</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}
    </div>
  );
}

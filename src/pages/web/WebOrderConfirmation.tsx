import { useParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function WebOrderConfirmation() {
  const { orderNumber } = useParams();

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-foreground mb-3">تم استلام طلبك!</h1>
      <p className="text-muted-foreground mb-2">رقم الطلب: <span className="font-bold text-gold">#{orderNumber}</span></p>
      <p className="text-muted-foreground mb-8">سنتواصل معك قريباً لتأكيد الطلب</p>
      <div className="flex gap-4 justify-center">
        <Link
          to="/web/track"
          className="px-6 py-3 border border-gold text-gold rounded-full font-medium hover:bg-gold/10 transition-colors"
        >
          تتبع الطلب
        </Link>
        <Link
          to="/web"
          className="px-6 py-3 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

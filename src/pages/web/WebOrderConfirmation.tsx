import { useParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function WebOrderConfirmation() {
  const { orderNumber } = useParams();

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-3">تم استلام طلبك!</h1>
      <p className="text-gray-600 mb-2">رقم الطلب: <span className="font-bold text-[hsl(36,56%,51%)]">#{orderNumber}</span></p>
      <p className="text-gray-500 mb-8">سنتواصل معك قريباً لتأكيد الطلب</p>
      <div className="flex gap-4 justify-center">
        <Link
          to={`/web/track`}
          className="px-6 py-3 border border-[hsl(36,56%,51%)] text-[hsl(36,56%,51%)] rounded-full font-medium hover:bg-[hsl(36,40%,95%)] transition-colors"
        >
          تتبع الطلب
        </Link>
        <Link
          to="/web"
          className="px-6 py-3 bg-[hsl(36,56%,51%)] text-white rounded-full font-medium hover:bg-[hsl(36,56%,45%)] transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Truck, CheckCircle, Clock } from "lucide-react";

const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "قيد الانتظار", icon: <Clock className="h-5 w-5" />, color: "text-yellow-500" },
  processing: { label: "قيد المعالجة", icon: <Package className="h-5 w-5" />, color: "text-blue-500" },
  completed: { label: "مكتمل", icon: <CheckCircle className="h-5 w-5" />, color: "text-green-500" },
  cancelled: { label: "ملغي", icon: <Clock className="h-5 w-5" />, color: "text-red-500" },
};

export default function WebTrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !phone) {
      toast.error("الرجاء إدخال رقم الطلب ورقم الهاتف");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", parseInt(orderNumber))
        .eq("customer_phone", phone)
        .maybeSingle();
      if (error) throw error;
      setOrder(data);
      if (!data) toast.error("لم يتم العثور على الطلب");
    } catch {
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setLoading(false);
    }
  };

  const status = order ? statusMap[order.status] || statusMap.pending : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">تتبع الطلب</h1>

      <form onSubmit={handleSearch} className="space-y-4 mb-8">
        <input
          type="number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="رقم الطلب"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(36,56%,51%)]"
          dir="ltr"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="رقم الهاتف"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(36,56%,51%)]"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[hsl(36,56%,51%)] text-white rounded-xl font-medium hover:bg-[hsl(36,56%,45%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Search className="h-5 w-5" />
          {loading ? "جاري البحث..." : "بحث"}
        </button>
      </form>

      {searched && order && status && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">رقم الطلب</span>
            <span className="font-bold">#{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">الحالة</span>
            <span className={`flex items-center gap-2 font-medium ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">المجموع</span>
            <span className="font-bold">₪{order.total?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">التاريخ</span>
            <span className="text-gray-700">{new Date(order.created_at).toLocaleDateString("ar")}</span>
          </div>
        </div>
      )}

      {searched && !order && !loading && (
        <p className="text-center text-gray-500">لم يتم العثور على طلب بهذه البيانات</p>
      )}
    </div>
  );
}

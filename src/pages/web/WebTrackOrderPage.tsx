import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package, Truck, CheckCircle, Clock } from "lucide-react";

const statusMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "قيد الانتظار", icon: <Clock className="h-5 w-5" />, color: "text-yellow-500" },
  processing: { label: "قيد المعالجة", icon: <Package className="h-5 w-5" />, color: "text-blue-500" },
  completed: { label: "مكتمل", icon: <CheckCircle className="h-5 w-5" />, color: "text-green-500" },
  cancelled: { label: "ملغي", icon: <Clock className="h-5 w-5" />, color: "text-destructive" },
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
    <div className="max-w-xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8 text-center">تتبع الطلب</h1>

      <form onSubmit={handleSearch} className="space-y-4 mb-8">
        <input
          type="number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="رقم الطلب"
          className="w-full px-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-gold transition-all"
          dir="ltr"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="رقم الهاتف"
          className="w-full px-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-gold transition-all"
          dir="ltr"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 web-gold-gradient text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
        >
          <Search className="h-5 w-5" />
          {loading ? "جاري البحث..." : "بحث"}
        </button>
      </form>

      {searched && order && status && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">رقم الطلب</span>
            <span className="font-bold">#{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الحالة</span>
            <span className={`flex items-center gap-2 font-medium ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المجموع</span>
            <span className="font-bold text-primary">₪{order.total?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">التاريخ</span>
            <span className="text-foreground">{new Date(order.created_at).toLocaleDateString("ar")}</span>
          </div>
        </div>
      )}

      {searched && !order && !loading && (
        <p className="text-center text-muted-foreground">لم يتم العثور على طلب بهذه البيانات</p>
      )}
    </div>
  );
}

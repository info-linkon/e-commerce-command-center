import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function WebTrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const { data, error: err } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", parseInt(orderNumber))
        .eq("customer_phone", phone)
        .maybeSingle();

      if (err) throw err;
      if (!data) {
        setError("لم يتم العثور على الطلب. تحقق من رقم الطلب ورقم الهاتف.");
      } else {
        setOrder(data);
      }
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 md:py-12 max-w-2xl">
      <div className="text-center mb-8">
        <Package className="w-12 h-12 mx-auto text-gold mb-4" />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">تتبع الطلب</h1>
        <p className="text-muted-foreground">أدخل رقم الطلب ورقم الهاتف لمتابعة حالة طلبك</p>
      </div>

      <form onSubmit={handleSearch} className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="orderNum">رقم الطلب</Label>
            <Input
              id="orderNum"
              type="number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="أدخل رقم الطلب"
              required
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXX-XXXX"
              required
              dir="ltr"
              className="mt-1"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-gold text-gold-foreground hover:bg-gold/90" disabled={loading}>
          <Search className="w-4 h-4 ml-2" />
          {loading ? "جاري البحث..." : "بحث عن الطلب"}
        </Button>
        {error && <p className="text-destructive text-sm mt-3 text-center">{error}</p>}
      </form>

      {order && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">رقم الطلب</p>
              <p className="font-bold text-lg">#{order.order_number}</p>
            </div>
            <span className="text-xl font-black text-primary">₪{order.total?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الحالة</span>
            <span className="font-medium">{statusLabels[order.status] || order.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">التاريخ</span>
            <span>{new Date(order.created_at).toLocaleDateString("ar")}</span>
          </div>
          {order.shipping_city && (
            <div className="text-sm pt-4 border-t border-border">
              <span className="text-muted-foreground">التوصيل إلى:</span> {order.shipping_city} - {order.shipping_address}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

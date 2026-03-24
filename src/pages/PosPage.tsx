import { useState, useMemo } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "sonner";

interface CartItem {
  variation_id: string;
  variation_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const PosPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");

  const createOrder = useCreateOrder();
  const { data: categories } = useCategories();

  const { data: variations } = useQuery({
    queryKey: ["pos-variations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*, products(name, category_id, is_published)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!variations) return [];
    return variations.filter((v) => {
      const product = v.products as any;
      const matchSearch = !search ||
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        product?.name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || product?.category_id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [variations, search, categoryFilter]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [cart]);

  const addToCart = (v: any) => {
    const existing = cart.find((c) => c.variation_id === v.id);
    if (existing) {
      setCart(cart.map((c) => c.variation_id === v.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        variation_id: v.id,
        variation_name: v.name,
        product_name: (v.products as any)?.name || "",
        quantity: 1,
        unit_price: Number(v.price),
      }]);
    }
  };

  const updateQuantity = (variationId: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.variation_id !== variationId) return c;
      const newQ = c.quantity + delta;
      return newQ <= 0 ? c : { ...c, quantity: newQ };
    }));
  };

  const removeFromCart = (variationId: string) => {
    setCart(cart.filter((c) => c.variation_id !== variationId));
  };

  const openCreateOrder = () => {
    if (cart.length === 0) return;
    setShowCreateOrder(true);
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim()) { toast.error("שם לקוח הוא שדה חובה"); return; }
    if (!customerPhone.trim()) { toast.error("טלפון הוא שדה חובה"); return; }
    if (!shippingAddress.trim()) { toast.error("כתובת היא שדה חובה"); return; }
    if (!shippingCity.trim()) { toast.error("עיר היא שדה חובה"); return; }

    const { data: { user } } = await supabase.auth.getUser();

    try {
      await createOrder.mutateAsync({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_city: shippingCity.trim(),
        total,
        status: "pending",
        source: "pos" as any,
        created_by: user?.id || undefined,
        items: cart.map((c) => ({
          variation_id: c.variation_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
          total_price: c.quantity * c.unit_price,
        })),
      } as any);

      setCart([]);
      setShowCreateOrder(false);
      setCustomerName("");
      setCustomerPhone("");
      setShippingAddress("");
      setShippingCity("");
      toast.success("ההזמנה נוצרה ונשלחה לתהליך ההזמנות");
      navigate("/orders");
    } catch {
      toast.error("שגיאה ביצירת הזמנה");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4" dir="rtl">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש מוצר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="קטגוריה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => addToCart(v)}
                className="rounded-lg border bg-card p-3 text-right hover:bg-accent transition-colors text-sm"
              >
                <div className="font-medium truncate">{(v.products as any)?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{v.name}</div>
                <div className="font-bold mt-1">₪{Number(v.price).toFixed(2)}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Panel */}
      <Card className="w-80 flex flex-col shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            עגלה ({cart.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-3 pt-0">
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 text-sm">העגלה ריקה</div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.variation_id} className="rounded-md border p-2 text-sm">
                    <div className="flex justify-between items-start">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.variation_id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      <div className="text-right flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground">{item.variation_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bold">₪{(item.quantity * item.unit_price).toFixed(2)}</div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variation_id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variation_id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-3" />

          <div className="space-y-3">
            <div className="flex justify-between text-lg font-bold">
              <span>₪{total.toFixed(2)}</span>
              <span>סה״כ</span>
            </div>
            <Button className="w-full" size="lg" onClick={openCreateOrder} disabled={cart.length === 0}>
              צור הזמנה
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת הזמנה - ₪{total.toFixed(2)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>שם לקוח (אופציונלי)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreateOrder} disabled={createOrder.isPending} className="w-full">
              {createOrder.isPending ? "מעבד..." : "צור ושלח להזמנות"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PosPage;

import { useState, useMemo } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, Package, Percent, BadgeDollarSign, CalendarIcon, Tag } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCategories } from "@/hooks/useCategories";
import { useDeliveryCompanies } from "@/hooks/useDeliveryCompanies";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { useBundlesStockBatch } from "@/hooks/useBundleStock";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface CartItem {
  // For regular products: variation_id is the product variation UUID. The cart key uses this id.
  // For custom (general) items: variation_id is undefined and `cart_uid` is used as the React key + identifier.
  variation_id?: string;
  variation_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  bundle_variation_id?: string;
  is_custom?: boolean;
  cart_uid: string;
}

interface GroupedProduct {
  product_id: string;
  product_name: string;
  category_id: string | null;
  image_url: string | null;
  variations: { id: string; name: string; price: number; bundle_variation_id?: string }[];
  isBundle?: boolean;
}

const PosPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [cashRegisterId, setCashRegisterId] = useState<string>("");
  const [variationPicker, setVariationPicker] = useState<GroupedProduct | null>(null);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [shippingPrice, setShippingPrice] = useState<number>(0);
  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemPrice, setCustomItemPrice] = useState<string>("");

  const createOrder = useCreateOrder();
  const { data: categories } = useCategories();
  const { data: deliveryCompanies } = useDeliveryCompanies(true);
  const { data: cashRegisters } = useCashRegisters();

  const { data: variations } = useQuery({
    queryKey: ["pos-variations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*, products(name, name_ar, image_url, category_id, is_published)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allBundles } = useQuery({
    queryKey: ["pos-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("id, bundle_type, product_id, products(name, name_ar, image_url, category_id, sale_price, is_published)");
      if (error) throw error;
      const variableBundleIds = (data || []).filter(b => b.bundle_type === "variable_bundle").map(b => b.id);
      let bundleVars: any[] = [];
      if (variableBundleIds.length > 0) {
        const { data: bv } = await supabase
          .from("bundle_variations")
          .select("id, name, price, bundle_id")
          .in("bundle_id", variableBundleIds)
          .order("name");
        bundleVars = bv || [];
      }
      // Fetch product_variations for all bundle products so we can use real variation_ids in orders
      const productIds = (data || []).map(b => b.product_id);
      let bundleProductVariations: any[] = [];
      if (productIds.length > 0) {
        const { data: pvs } = await supabase
          .from("product_variations")
          .select("id, product_id, name, price")
          .in("product_id", productIds)
          .order("name");
        bundleProductVariations = pvs || [];
      }
      return { bundles: data || [], bundleVars, bundleProductVariations };
    },
  });

  const bundleIds = useMemo(() => (allBundles?.bundles || []).map(b => b.id), [allBundles]);
  const { data: bundleStockData } = useBundlesStockBatch(bundleIds);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, GroupedProduct>();
    if (variations) {
      for (const v of variations) {
        const product = v.products as any;
        if (!product) continue;
        const pid = v.product_id;
        const isBundleProduct = allBundles?.bundles.some(b => b.product_id === pid);
        if (isBundleProduct) continue;
        if (!map.has(pid)) {
          map.set(pid, { product_id: pid, product_name: product.name_ar || product.name, image_url: product.image_url, category_id: product.category_id, variations: [] });
        }
        map.get(pid)!.variations.push({ id: v.id, name: v.name, price: Number(v.price) });
      }
    }
    if (allBundles) {
      const bpvs = allBundles.bundleProductVariations || [];
      for (const bundle of allBundles.bundles) {
        const product = bundle.products as any;
        if (!product || !product.is_published) continue;
        const pid = bundle.product_id;
        // Get the product_variations for this bundle's product
        const productVars = bpvs.filter((pv: any) => pv.product_id === pid);
        if (bundle.bundle_type === "simple_bundle") {
          // Use the first product_variation if available, otherwise skip (can't create order without one)
          const firstVar = productVars[0];
          if (productVars.length <= 1) {
            map.set(pid, {
              product_id: pid, product_name: product.name_ar || product.name, image_url: product.image_url, category_id: product.category_id,
              variations: [{ id: firstVar?.id || bundle.id, name: product.name_ar || product.name, price: Number(product.sale_price) }],
              isBundle: true,
            });
          } else {
            // Multiple variations on a simple bundle product — show them all
            map.set(pid, {
              product_id: pid, product_name: product.name_ar || product.name, image_url: product.image_url, category_id: product.category_id,
              variations: productVars.map((pv: any) => ({ id: pv.id, name: pv.name, price: Number(product.sale_price) })),
              isBundle: true,
            });
          }
        } else {
          // Variable bundle — use bundle_variations and map to default product_variation
          const bvs = allBundles.bundleVars.filter(bv => bv.bundle_id === bundle.id);
          const defaultProductVar = bpvs.find((pv: any) => pv.product_id === pid);
          if (bvs.length > 0 && defaultProductVar) {
            map.set(pid, {
              product_id: pid, product_name: product.name_ar || product.name, image_url: product.image_url, category_id: product.category_id,
              variations: bvs.map(bv => ({ id: defaultProductVar.id, name: bv.name, price: Number(bv.price), bundle_variation_id: bv.id })),
              isBundle: true,
            });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [variations, allBundles]);

  const filtered = useMemo(() => {
    return groupedProducts.filter((p) => {
      const matchSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase()) || p.variations.some(v => v.name.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = categoryFilter === "all" || p.category_id === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [groupedProducts, search, categoryFilter]);

  const getBundleInfo = (productId: string) => {
    const bundle = allBundles?.bundles.find(b => b.product_id === productId);
    if (!bundle || !bundleStockData) return null;
    if (bundle.bundle_type === "simple_bundle") {
      const stock = bundleStockData.simpleStock?.get(bundle.id);
      return { bundleId: bundle.id, type: bundle.bundle_type, inStock: stock?.inStock ?? true, maxQuantity: stock?.maxQuantity ?? 0 };
    }
    const varStock = bundleStockData.variableStock?.get(bundle.id);
    const anyInStock = varStock ? [...varStock.values()].some(s => s.inStock) : true;
    return { bundleId: bundle.id, type: bundle.bundle_type, inStock: anyInStock, variationStock: varStock };
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === "none" || discountValue <= 0) return 0;
    if (discountType === "percent") return Math.min(subtotal * (discountValue / 100), subtotal);
    return Math.min(discountValue, subtotal);
  }, [discountType, discountValue, subtotal]);

  const total = subtotal - discountAmount + shippingPrice;

  const addToCart = (variation: { id: string; name: string; price: number; bundle_variation_id?: string }, productName: string) => {
    const existing = cart.find((c) => c.variation_id === variation.id && c.bundle_variation_id === variation.bundle_variation_id);
    if (existing) {
      setCart(cart.map((c) => (c.variation_id === variation.id && c.bundle_variation_id === variation.bundle_variation_id) ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { cart_uid: variation.id + (variation.bundle_variation_id || ""), variation_id: variation.id, variation_name: variation.name, product_name: productName, quantity: 1, unit_price: variation.price, bundle_variation_id: variation.bundle_variation_id }]);
    }
  };

  const addCustomItem = () => {
    const price = parseFloat(customItemPrice);
    if (!price || price <= 0) {
      toast.error("הכנס מחיר חוקי");
      return;
    }
    const uid = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setCart([...cart, {
      cart_uid: uid,
      variation_id: undefined,
      variation_name: "",
      product_name: "פריט כללי",
      quantity: 1,
      unit_price: price,
      is_custom: true,
    }]);
    setCustomItemPrice("");
    setCustomItemOpen(false);
  };

  const handleProductClick = (product: GroupedProduct) => {
    if (product.variations.length === 1) {
      addToCart(product.variations[0], product.product_name);
    } else {
      setVariationPicker(product);
    }
  };

  const handleVariationSelect = (variation: { id: string; name: string; price: number }) => {
    if (variationPicker) {
      addToCart(variation, variationPicker.product_name);
      setVariationPicker(null);
    }
  };

  const updateQuantity = (uid: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.cart_uid !== uid) return c;
      const newQ = c.quantity + delta;
      return newQ <= 0 ? c : { ...c, quantity: newQ };
    }));
  };

  const setQuantity = (uid: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.cart_uid !== uid));
      return;
    }
    setCart(cart.map((c) => (c.cart_uid === uid ? { ...c, quantity: qty } : c)));
  };

  const removeFromCart = (uid: string) => {
    setCart(cart.filter((c) => c.cart_uid !== uid));
  };

  const openCreateOrder = () => {
    if (cart.length === 0) return;
    setCartDrawerOpen(false);
    setShowCreateOrder(true);
  };

  const handleCreateOrder = async () => {
    if (!customerName.trim()) { toast.error("שם לקוח הוא שדה חובה"); return; }
    if (!customerPhone.trim()) { toast.error("טלפון הוא שדה חובה"); return; }
    if (paymentMethod === "cash" && !cashRegisterId) { toast.error("בחר קופה לתשלום במזומן"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const isHypLink = paymentMethod === "credit_link";

    try {
      const newOrder = await createOrder.mutateAsync({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_city: shippingCity.trim() || undefined,
        shipping_address: shippingAddress.trim() || undefined,
        total,
        // For HYP-link flow the order starts as pending_payment and the payment
        // row is created only after the customer actually pays (via hyp-verify).
        status: isHypLink ? "pending_payment" : "pending",
        source: "pos" as any,
        created_by: user?.id || undefined,
        payment_method: isHypLink ? "credit" : paymentMethod,
        cash_register_id: paymentMethod === "cash" ? cashRegisterId : undefined,
        delivery_method: deliveryMethod,
        discount_type: discountType !== "none" ? discountType : undefined,
        discount_value: discountType !== "none" ? discountValue : undefined,
        discount_amount: discountType !== "none" ? discountAmount : undefined,
        shipping_cost: shippingPrice > 0 ? shippingPrice : undefined,
        created_at: orderDate.toISOString(),
        skip_auto_payment: isHypLink,
        items: cart.map((c) => ({
          variation_id: c.variation_id, // may be undefined for custom items — handled in useOrders
          quantity: c.quantity,
          unit_price: c.unit_price,
          total_price: c.quantity * c.unit_price,
          bundle_variation_id: c.bundle_variation_id || undefined,
        })),
      } as any);

      if (isHypLink) {
        // Send HYP payment link via SMS to the customer.
        const { data: linkData, error: linkErr } = await supabase.functions.invoke("hyp-payment-link", {
          body: { order_id: newOrder.id },
        });
        if (linkErr || linkData?.error) {
          toast.error(`הזמנה נוצרה אך לינק HYP לא נשלח: ${linkErr?.message || linkData?.error}`);
        } else if (linkData?.sms_sent) {
          toast.success("ההזמנה נוצרה ולינק תשלום נשלח ללקוח ב-SMS");
        } else {
          toast.warning(`הזמנה נוצרה. לינק נוצר אך SMS לא נשלח: ${linkData?.sms_error || "שגיאה"}`);
        }
      } else {
        // Trigger SMS for new POS order (non-HYP path)
        supabase.functions.invoke("order-sms-trigger", {
          body: { order_id: newOrder.id, trigger_type: "order_created" },
        }).catch(console.error);
        toast.success("ההזמנה נוצרה ונשלחה לתהליך ההזמנות");
      }

      setCart([]);
      setShowCreateOrder(false);
      setCustomerName("");
      setCustomerPhone("");
      setShippingCity("");
      setShippingAddress("");
      setDeliveryMethod("pickup");
      setPaymentMethod("cash");
      setCashRegisterId("");
      setDiscountType("none");
      setDiscountValue(0);
      setShippingPrice(0);
      setOrderDate(new Date());
      navigate("/crm/orders");
    } catch {
      toast.error("שגיאה ביצירת הזמנה");
    }
  };

  const priceDisplay = (vars: { price: number }[]) => {
    const prices = vars.map(v => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₪${min.toFixed(2)}`;
    return `₪${min.toFixed(2)} - ₪${max.toFixed(2)}`;
  };

  // Cart content (shared between desktop panel and mobile drawer)
  const cartContent = (
    <>
      <ScrollArea className="flex-1 min-h-0 pl-2">
        {cart.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">העגלה ריקה</div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.cart_uid} className="rounded-md border p-2 text-sm">
                <div className="flex justify-between items-start">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.cart_uid)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                  <div className="text-right flex-1">
                    <div className="font-medium flex items-center justify-end gap-1">
                      {item.product_name}
                      {item.is_custom && <Badge variant="secondary" className="text-[9px] px-1 py-0">כללי</Badge>}
                    </div>
                    {item.variation_name && <div className="text-xs text-muted-foreground">{item.variation_name}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="font-bold">₪{(item.quantity * item.unit_price).toFixed(2)}</div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cart_uid, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setQuantity(item.cart_uid, v);
                      }}
                      className="h-6 w-12 text-center text-sm px-1"
                      dir="ltr"
                    />
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.cart_uid, 1)}>
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
        {/* Discount controls */}
        <div className="space-y-2">
          <div className="flex gap-1">
            <Button
              variant={discountType === "percent" ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => { setDiscountType(discountType === "percent" ? "none" : "percent"); setDiscountValue(0); }}
            >
              <Percent className="h-3 w-3 ml-1" />
              הנחה %
            </Button>
            <Button
              variant={discountType === "fixed" ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => { setDiscountType(discountType === "fixed" ? "none" : "fixed"); setDiscountValue(0); }}
            >
              <BadgeDollarSign className="h-3 w-3 ml-1" />
              הנחה ₪
            </Button>
          </div>
          {discountType !== "none" && (
            <Input
              type="number"
              min={0}
              max={discountType === "percent" ? 100 : subtotal}
              value={discountValue || ""}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              placeholder={discountType === "percent" ? "אחוז הנחה" : "סכום הנחה"}
              className="text-center h-8 text-sm"
            />
          )}
        </div>

        {/* Subtotal + discount display */}
        {(discountAmount > 0 || shippingPrice > 0) && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>₪{subtotal.toFixed(2)}</span>
              <span>סכום ביניים</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>-₪{discountAmount.toFixed(2)}</span>
                <span>הנחה {discountType === "percent" ? `(${discountValue}%)` : ""}</span>
              </div>
            )}
            {shippingPrice > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>₪{shippingPrice.toFixed(2)}</span>
                <span>משלוח</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between text-lg font-bold">
          <span>₪{total.toFixed(2)}</span>
          <span>סה״כ</span>
        </div>
        <Button className="w-full" size="lg" onClick={openCreateOrder} disabled={cart.length === 0}>
          צור הזמנה
        </Button>
      </div>
    </>
  );

  return (
    <div className={`flex ${isMobile ? "flex-col" : ""} h-[calc(100vh-4rem)] gap-4`} dir="rtl">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש מוצר..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-24 sm:w-32"><SelectValue placeholder="קטגוריה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => { setCustomItemPrice(""); setCustomItemOpen(true); }} title="הוסף פריט כללי">
            <Tag className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.map((product) => {
              const bundleInfo = getBundleInfo(product.product_id);
              const outOfStock = bundleInfo ? !bundleInfo.inStock : false;
              return (
                <button
                  key={product.product_id}
                  onClick={() => !outOfStock && handleProductClick(product)}
                  disabled={outOfStock}
                  className={`rounded-lg border bg-card p-2 text-right transition-colors text-sm relative flex flex-col items-center ${outOfStock ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                >
                  {product.isBundle && (
                    <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1.5 py-0 gap-0.5">
                      <Package className="h-2.5 w-2.5" />
                      מארז
                    </Badge>
                  )}
                  {outOfStock && (
                    <Badge variant="destructive" className="absolute top-1 left-1 text-[10px] px-1.5 py-0">אזל</Badge>
                  )}
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.product_name} className="w-12 h-12 rounded object-cover mt-1 mb-1" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center mt-1 mb-1">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="font-medium truncate w-full text-center">{product.product_name}</div>
                  {product.variations.length === 1 ? (
                    <div className="text-xs text-muted-foreground truncate">{product.variations[0].name}</div>
                  ) : (
                    <div className="text-xs text-primary font-medium">{product.variations.length} וריאציות</div>
                  )}
                  <div className="font-bold mt-1">{priceDisplay(product.variations)}</div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Desktop: Cart Panel */}
      {!isMobile && (
        <Card className="w-80 flex flex-col shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              עגלה ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-3 pt-0">
            {cartContent}
          </CardContent>
        </Card>
      )}

      {/* Mobile: FAB + Drawer */}
      {isMobile && (
        <>
          <Button
            className="fixed bottom-6 left-6 z-40 rounded-full h-14 w-14 shadow-lg"
            onClick={() => setCartDrawerOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Button>
          <Drawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
            <DrawerContent className="max-h-[85vh]" dir="rtl">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  עגלה ({cart.length})
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 flex flex-col px-4 pb-4 overflow-auto max-h-[60vh]">
                {cartContent}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Variation Picker */}
      <Dialog open={!!variationPicker} onOpenChange={(open) => !open && setVariationPicker(null)}>
        <DialogContent className="max-w-sm sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{variationPicker?.product_name} — בחר וריאציה</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            {variationPicker?.variations.map((v) => {
              const bundleInfo = variationPicker ? getBundleInfo(variationPicker.product_id) : null;
              const varStock = bundleInfo?.type === "variable_bundle" && (bundleInfo as any).variationStock;
              const isVarOutOfStock = varStock ? !(varStock.get(v.id)?.inStock ?? true) : false;
              return (
                <button
                  key={v.id}
                  onClick={() => !isVarOutOfStock && handleVariationSelect(v)}
                  disabled={isVarOutOfStock}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${isVarOutOfStock ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                >
                  <span className="font-bold">₪{v.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{v.name}</span>
                    {isVarOutOfStock && <Badge variant="destructive" className="text-[10px] px-1 py-0">אזל</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת הזמנה - ₪{total.toFixed(2)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-right overflow-y-auto flex-1 -mx-1 px-1">
            <div>
              <Label>תאריך ההזמנה *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-right font-normal", !orderDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {orderDate ? format(orderDate, "dd/MM/yyyy") : "בחר תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={orderDate}
                    onSelect={(d) => d && setOrderDate(d)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>שם לקוח *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="text-right" dir="rtl" />
            </div>
            <div>
              <Label>טלפון *</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} type="tel" dir="ltr" className="text-left" />
            </div>
            <div>
              <Label>עיר</Label>
              <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} className="text-right" dir="rtl" placeholder="לדוגמה: אום אל-פחם" />
            </div>
            <div>
              <Label>כתובת</Label>
              <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="text-right" dir="rtl" placeholder="רחוב, מספר בית" />
            </div>
            <Separator />
            <div>
              <Label>שיטת משלוח *</Label>
              <Select value={deliveryMethod} onValueChange={setDeliveryMethod} dir="rtl">
                <SelectTrigger dir="rtl" className="text-right"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="pickup">איסוף עצמי</SelectItem>
                  {deliveryCompanies?.map((dc) => (
                    <SelectItem key={dc.id} value={dc.id}>{dc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שיטת תשלום *</Label>
              <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); if (v !== "cash") setCashRegisterId(""); }} dir="rtl">
                <SelectTrigger dir="rtl" className="text-right"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="cash">מזומן</SelectItem>
                  <SelectItem value="credit">אשראי (רישום ידני)</SelectItem>
                  <SelectItem value="credit_link">אשראי - שלח לינק HYP ב-SMS</SelectItem>
                </SelectContent>
              </Select>
              {paymentMethod === "credit_link" && (
                <p className="text-xs text-muted-foreground mt-1">
                  הלקוח יקבל SMS עם לינק תשלום. ההזמנה תסומן כ"ממתינה לתשלום" עד שהוא ישלם.
                </p>
              )}
            </div>
            {paymentMethod === "cash" && (
              <div>
                <Label>קופה *</Label>
                <Select value={cashRegisterId} onValueChange={setCashRegisterId} dir="rtl">
                  <SelectTrigger dir="rtl" className="text-right"><SelectValue placeholder="בחר קופה..." /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {cashRegisters?.filter(r => r.is_active).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator />
            <div>
              <Label>מחיר משלוח (אופציונלי)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={shippingPrice || ""}
                onChange={(e) => setShippingPrice(Number(e.target.value))}
                placeholder="0"
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateOrder} disabled={createOrder.isPending} className="w-full">
              {createOrder.isPending ? "מעבד..." : "צור ושלח להזמנות"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Item Dialog */}
      <Dialog open={customItemOpen} onOpenChange={setCustomItemOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת פריט כללי</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>מחיר (₪) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomItem(); }}
                placeholder="0.00"
                dir="ltr"
                className="text-left"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              פריט כללי לא משתייך למוצר ולא משפיע על המלאי או על תהליך הליקוט.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={addCustomItem} className="w-full">הוסף לעגלה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PosPage;

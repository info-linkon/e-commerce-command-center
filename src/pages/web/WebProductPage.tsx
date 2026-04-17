import { useParams } from "react-router-dom";
import { useWebProduct, useWebProductVariations, useWebBundleVariations } from "@/hooks/useWebProducts";
import { useCartStore } from "@/lib/web-cart-store";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBundleStock } from "@/hooks/useBundleStock";
import { fbq } from "@/lib/meta-pixel";
import { useLanguage } from "@/hooks/useLanguage";

export default function WebProductPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const { data: product, isLoading } = useWebProduct(id);
  const productId = product?.id;
  const { data: variations } = useWebProductVariations(productId);
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);

  // Check if product is a bundle
  const { data: bundleData } = useQuery({
    queryKey: ["product-bundle", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bundles")
        .select("id, bundle_type")
        .eq("product_id", productId!)
        .maybeSingle();
      return data;
    },
  });

  // Fetch bundle variations for variable bundles
  const { data: bundleVariations } = useWebBundleVariations(
    bundleData?.bundle_type === "variable_bundle" ? bundleData?.id : undefined
  );

  const { data: bundleStockResult } = useBundleStock(bundleData?.id, bundleData?.bundle_type);

  // Fetch inventory stock for regular (non-bundle) products
  const { data: inventoryStock } = useQuery({
    queryKey: ["product-inventory-stock", productId],
    enabled: !!productId && !bundleData,
    queryFn: async () => {
      // Get all variations for this product
      const { data: vars } = await supabase
        .from("product_variations")
        .select("id")
        .eq("product_id", productId!);
      if (!vars || vars.length === 0) return new Map<string, number>();
      const varIds = vars.map(v => v.id);
      const { data: inv } = await supabase
        .from("inventory")
        .select("variation_id, quantity")
        .in("variation_id", varIds);
      const stockMap = new Map<string, number>();
      for (const row of (inv || [])) {
        stockMap.set(row.variation_id, (stockMap.get(row.variation_id) || 0) + row.quantity);
      }
      return stockMap;
    },
  });

  // Meta Pixel: ViewContent — always use product SKU to match Catalog feed
  useEffect(() => {
    if (product && product.sku) {
      fbq("ViewContent", {
        content_ids: [product.sku],
        content_name: product.name_ar || product.name,
        content_type: "product",
        value: product.sale_price,
        currency: "ILS",
      });
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="container py-16 text-center text-muted-foreground">{t("جاري التحميل...", "טוען...")}</div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16 text-center text-muted-foreground">{t("المنتج غير موجود", "המוצר לא נמצא")}</div>
    );
  }

  const gallery = Array.isArray(product.gallery_images)
    ? (product.gallery_images as { src: string }[])
    : [];
  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...gallery.map((g) => g.src),
  ];
  const displayImage = mainImage || allImages[0] || null;

  // Determine if this is a variable bundle or a regular variable product
  const isVariableBundle = bundleData?.bundle_type === "variable_bundle" && bundleVariations && bundleVariations.length > 0;
  const isVariable = !isVariableBundle && product.product_type === "variable" && variations && variations.length > 0;

  // Active variation for regular variable products
  const activeVariation = isVariable
    ? variations!.find((v) => v.id === selectedVariation) || variations![0]
    : null;

  // Active bundle variation for variable bundles
  const activeBundleVariation = isVariableBundle
    ? bundleVariations!.find((v) => v.id === selectedVariation) || bundleVariations![0]
    : null;

  const price = activeBundleVariation
    ? activeBundleVariation.price
    : activeVariation
      ? activeVariation.price
      : product.sale_price;

  const displayName = lang === "he" ? (product.name || product.name_ar) : (product.name_ar || product.name);

  // Bundle stock check
  const isBundleOutOfStock = (() => {
    if (!bundleData || !bundleStockResult) return false;
    if (bundleStockResult.simple) return !bundleStockResult.simple.inStock;
    // For variable bundles, check the selected variation
    if (isVariableBundle && bundleStockResult.variations && activeBundleVariation) {
      const varStock = bundleStockResult.variations.get(activeBundleVariation.id);
      return varStock ? !varStock.inStock : false;
    }
    return false;
  })();

  // Regular product stock check
  const isRegularOutOfStock = (() => {
    if (bundleData) return false; // handled by isBundleOutOfStock
    if (!inventoryStock) return false;
    if (isVariable && activeVariation) {
      return (inventoryStock.get(activeVariation.id) || 0) <= 0;
    }
    // Simple product — check first variation
    if (variations && variations.length > 0) {
      const firstVar = variations[0];
      return (inventoryStock.get(firstVar.id) || 0) <= 0;
    }
    return false;
  })();

  const isOutOfStock = isBundleOutOfStock || isRegularOutOfStock;

  const handleAddToCart = () => {
    if (isVariable && !activeVariation) {
      toast.error(t("الرجاء اختيار نوع المنتج", "יש לבחור סוג מוצר"));
      return;
    }
    if (isVariableBundle && !activeBundleVariation) {
      toast.error(t("الرجاء اختيار نوع الطقم", "יש לבחור סוג ערכה"));
      return;
    }

    const variationId = activeVariation?.id || variations?.[0]?.id || product.id;
    const variationName = activeBundleVariation?.name || activeVariation?.name_ar || activeVariation?.name || "";

    const productSku = product.sku || null;

    for (let i = 0; i < quantity; i++) {
      addItem({
        variationId,
        productId: product.id,
        productName: displayName,
        variationName,
        price,
        imageUrl: activeVariation?.image_url || product.image_url,
        shippingPrice: Number((product as any).shipping_price || 0),
        bundleVariationId: activeBundleVariation?.id || undefined,
        sku: activeVariation?.sku || product.sku || null,
        catalogId: productSku,
      }, 1);
    }
    // Meta Pixel: AddToCart - always send product SKU only
    if (productSku) {
      fbq("AddToCart", {
        content_ids: [productSku],
        content_name: displayName,
        content_type: "product",
        value: price * quantity,
        currency: "ILS",
      });
    }
    toast.success(t("تمت الإضافة إلى السلة", "נוסף לסל"));
  };

  return (
    <div className="container py-6 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
        {/* Image */}
        <div>
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-4 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
            {displayImage ? (
              <img src={displayImage} alt={displayName} className="w-full h-auto max-h-[600px] object-contain rounded-xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    (mainImage || allImages[0]) === img ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col justify-center">
          <div className="flex items-start justify-between gap-2 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{displayName}</h1>
            <ShareProductButton productNumber={product.product_number} productName={displayName} />
          </div>
          {lang === "he" ? (
            (product.description || product.description_ar) && (
              <div className="text-muted-foreground leading-relaxed mb-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description || product.description_ar }} />
            )
          ) : (
            product.description_ar ? (
              <div className="text-muted-foreground leading-relaxed mb-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description_ar }} />
            ) : product.description ? (
              <div className="text-muted-foreground leading-relaxed mb-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : null
          )}

          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-black text-primary">₪{price.toFixed(2)}</span>
          </div>

          {/* Regular product variations */}
          {isVariable && variations && (
            <div className="mb-6">
              <span className="text-sm font-medium mb-2 block">{t("اختر النوع:", "בחר סוג:")}</span>
              <div className="flex flex-wrap gap-2">
              {variations.map((v) => {
                  const vOutOfStock = inventoryStock ? (inventoryStock.get(v.id) || 0) <= 0 : false;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !vOutOfStock && setSelectedVariation(v.id)}
                      disabled={vOutOfStock}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        vOutOfStock
                          ? "opacity-50 cursor-not-allowed border-border"
                          : (selectedVariation || variations[0].id) === v.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                      }`}
                    >
                      {lang === "he" ? (v.name || v.name_ar) : (v.name_ar || v.name)}
                      {vOutOfStock && t(" (غير متوفر)", " (אזל)")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bundle variations */}
          {isVariableBundle && bundleVariations && (
            <div className="mb-6">
              <span className="text-sm font-medium mb-2 block">{t("اختر الطقم:", "בחר ערכה:")}</span>
              <div className="flex flex-wrap gap-2">
                {bundleVariations.map((bv) => {
                  const bvStock = bundleStockResult?.variations?.get(bv.id);
                  const bvOutOfStock = bvStock ? !bvStock.inStock : false;
                  return (
                    <button
                      key={bv.id}
                      onClick={() => !bvOutOfStock && setSelectedVariation(bv.id)}
                      disabled={bvOutOfStock}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        bvOutOfStock
                          ? "opacity-50 cursor-not-allowed border-border"
                          : (selectedVariation || bundleVariations[0].id) === bv.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                      }`}
                    >
                      {lang === "he" ? ((bv as any).name_he || bv.name) : (bv.name)} - ₪{bv.price.toFixed(2)}
                      {bvOutOfStock && t(" (غير متوفر)", " (אזל)")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
            <div className="flex items-center border border-border rounded-lg self-start">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-muted transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-bold">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-muted transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              size="lg"
              className="w-full sm:flex-1 bg-gold text-gold-foreground hover:bg-gold/90 font-bold"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="w-4 h-4 ml-2" />
              {isOutOfStock ? t("غير متوفر", "אזל מהמלאי") : t("أضف إلى السلة", "הוסף לסל")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareProductButton({ productNumber, productName }: { productNumber: number; productName: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const shareUrl = `https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/product-share/${productNumber}`;

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url: shareUrl });
        return;
      } catch {}
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(t("تم نسخ رابط المنتج", "הקישור הועתק"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
      title={t("مشاركة المنتج", "שתף מוצר")}
    >
      {copied ? <Check className="h-5 w-5 text-green-500" /> : <Share2 className="h-5 w-5" />}
    </button>
  );
}

import { useParams } from "react-router-dom";
import { useWebProduct, useWebProductVariations } from "@/hooks/useWebProducts";
import { useCartStore } from "@/lib/web-cart-store";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus } from "lucide-react";

export default function WebProductPage() {
  const { id } = useParams();
  const { data: product, isLoading } = useWebProduct(id);
  const { data: variations } = useWebProductVariations(id);
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">المنتج غير موجود</h1>
      </div>
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

  const isVariable = product.product_type === "variable" && variations && variations.length > 0;
  const activeVariation = isVariable
    ? variations.find((v) => v.id === selectedVariation) || variations[0]
    : null;
  const price = activeVariation ? activeVariation.price : product.sale_price;
  const displayName = product.name_ar || product.name;

  const handleAddToCart = () => {
    if (isVariable && !activeVariation) {
      toast.error("الرجاء اختيار نوع المنتج");
      return;
    }
    addItem({
      variationId: activeVariation?.id || product.id,
      productId: product.id,
      productName: displayName,
      variationName: activeVariation?.name_ar || activeVariation?.name || "",
      price,
      imageUrl: activeVariation?.image_url || product.image_url,
    }, quantity);
    toast.success("تمت الإضافة إلى السلة");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-4 border border-border">
            {displayImage ? (
              <img src={displayImage} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    (mainImage || allImages[0]) === img ? "border-gold ring-2 ring-gold/20" : "border-border hover:border-gold/40"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            {(product as any).categories?.name && (
              <p className="text-sm text-gold font-medium mb-2">{(product as any).categories.name}</p>
            )}
            <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
          </div>

          <p className="text-3xl font-bold text-primary">₪{price.toFixed(2)}</p>

          {product.description_ar && (
            <p className="text-muted-foreground leading-relaxed">{product.description_ar}</p>
          )}
          {!product.description_ar && product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Variations */}
          {isVariable && variations && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">اختر النوع</label>
              <div className="flex flex-wrap gap-2">
                {variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariation(v.id)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      (selectedVariation || variations[0].id) === v.id
                        ? "border-gold bg-gold text-gold-foreground shadow-md"
                        : "border-border hover:border-gold/40 text-foreground"
                    }`}
                  >
                    {v.name_ar || v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">الكمية</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-medium w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="w-full py-4 web-gold-gradient text-white rounded-xl font-medium text-lg hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-3"
          >
            <ShoppingCart className="h-5 w-5" />
            أضف إلى السلة
          </button>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface WebProductCardProps {
  id: string;
  productNumber?: number | null;
  name: string;
  nameAr?: string | null;
  price: number;
  originalPrice?: number | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  categoryNameHe?: string | null;
  outOfStock?: boolean;
}

export function WebProductCard({ id, productNumber, name, nameAr, price, originalPrice, imageUrl, categoryName, categoryNameHe, outOfStock }: WebProductCardProps) {
  const { lang, localizedPath } = useLanguage();
  const displayName = lang === "he" ? (name || nameAr || "") : (nameAr || name);
  const linkId = productNumber || id;
  const displayCategory = lang === "he" ? (categoryNameHe || categoryName) : (categoryName || categoryNameHe);

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className={`group relative bg-card rounded-xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${outOfStock ? "opacity-60" : ""}`}>
      {outOfStock && (
        <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {lang === "he" ? "אזל מהמלאי" : "غير متوفر"}
        </div>
      )}
      {hasDiscount && !outOfStock && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          -{discountPercent}%
        </div>
      )}
      <Link to={localizedPath(`/product/${linkId}`)} className="block relative overflow-hidden">
        <div className="aspect-square bg-muted flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <svg className="w-16 h-16 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          )}
        </div>
      </Link>

      <div className="p-3 md:p-4">
        {displayCategory && (
          <p className="text-xs text-gold font-medium mb-1">{displayCategory}</p>
        )}
        <Link to={localizedPath(`/product/${linkId}`)}>
          <h3 className="font-semibold text-xs md:text-sm leading-snug mb-2 line-clamp-2 hover:text-primary transition-colors">
            {displayName}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-base md:text-lg">₪{price.toFixed(2)}</span>
            {hasDiscount && (
              <span className="text-muted-foreground line-through text-xs md:text-sm">₪{originalPrice.toFixed(2)}</span>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary"
            asChild
          >
            <Link to={localizedPath(`/product/${linkId}`)}>
              <ShoppingCart className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

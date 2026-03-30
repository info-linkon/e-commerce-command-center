import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WebProductCardProps {
  id: string;
  productNumber?: number | null;
  name: string;
  nameAr?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
}

export function WebProductCard({ id, productNumber, name, nameAr, price, imageUrl, categoryName }: WebProductCardProps) {
  const displayName = nameAr || name;
  const linkId = productNumber || id;

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <Link to={`/web/product/${linkId}`} className="block relative overflow-hidden">
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

      <div className="p-4">
        {categoryName && (
          <p className="text-xs text-gold font-medium mb-1">{categoryName}</p>
        )}
        <Link to={`/web/product/${linkId}`}>
          <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 hover:text-primary transition-colors">
            {displayName}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-3">
          <span className="text-primary font-bold text-lg">₪{price.toFixed(2)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary"
            asChild
          >
            <Link to={`/web/product/${linkId}`}>
              <ShoppingCart className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

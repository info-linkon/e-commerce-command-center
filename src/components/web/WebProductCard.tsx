import { Link } from "react-router-dom";

interface WebProductCardProps {
  id: string;
  name: string;
  nameAr?: string | null;
  price: number;
  imageUrl?: string | null;
  categoryName?: string | null;
}

export function WebProductCard({ id, name, nameAr, price, imageUrl, categoryName }: WebProductCardProps) {
  const displayName = nameAr || name;

  return (
    <Link
      to={`/web/product/${id}`}
      className="group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        {categoryName && (
          <p className="text-xs text-gold font-medium mb-1">{categoryName}</p>
        )}
        <h3 className="text-sm font-medium text-card-foreground line-clamp-2 mb-2 group-hover:text-gold transition-colors">{displayName}</h3>
        <p className="text-lg font-bold text-primary">₪{price.toFixed(2)}</p>
      </div>
    </Link>
  );
}

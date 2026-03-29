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
      className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        {categoryName && (
          <p className="text-xs text-[hsl(36,56%,51%)] mb-1">{categoryName}</p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">{displayName}</h3>
        <p className="text-lg font-bold text-[hsl(30,15%,12%)]">₪{price.toFixed(2)}</p>
      </div>
    </Link>
  );
}

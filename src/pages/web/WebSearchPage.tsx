import { useEffect, useState } from "react";
import { useWebSearch } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { Search } from "lucide-react";
import { gaSearch } from "@/lib/gtag";

export default function WebSearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useWebSearch(query);

  // GA4: search — debounced fire when the user pauses for 600ms with a query >= 2 chars
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => gaSearch(query.trim()), 600);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">البحث</h1>

      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full pr-12 pl-4 py-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-gold focus:border-transparent outline-none text-lg transition-all"
        />
      </div>

      {query.length >= 2 && (
        isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl aspect-square animate-pulse border border-border" />
            ))}
          </div>
        ) : results?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map((product) => (
              <WebProductCard
                key={product.id}
                id={product.id}
                productNumber={(product as any).product_number}
                name={product.name}
                nameAr={product.name_ar}
                price={product.sale_price}
                imageUrl={product.image_url}
                categoryName={(product as any).categories?.name} categoryNameHe={(product as any).categories?.name_he}
                outOfStock={(product as any).outOfStock}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">لا توجد نتائج لـ "{query}"</p>
        )
      )}
    </div>
  );
}

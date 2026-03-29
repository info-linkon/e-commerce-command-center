import { useState } from "react";
import { useWebSearch } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { Search } from "lucide-react";

export default function WebSearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useWebSearch(query);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">البحث</h1>

      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="w-full pr-12 pl-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[hsl(36,56%,51%)] focus:border-transparent outline-none text-lg"
        />
      </div>

      {query.length >= 2 && (
        isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : results?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map((product) => (
              <WebProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                nameAr={product.name_ar}
                price={product.sale_price}
                imageUrl={product.image_url}
                categoryName={(product as any).categories?.name}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">لا توجد نتائج لـ "{query}"</p>
        )
      )}
    </div>
  );
}

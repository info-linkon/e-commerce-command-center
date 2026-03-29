import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useState } from "react";

export default function WebShopPage() {
  const { data: products, isLoading } = useWebProducts();
  const { data: categories } = useWebCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = selectedCategory
    ? products?.filter((p) => p.category_id === selectedCategory)
    : products;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">جميع المنتجات</h1>

      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedCategory
                ? "bg-gold text-gold-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:border-gold/40"
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-gold text-gold-foreground shadow-md"
                  : "bg-card text-muted-foreground border border-border hover:border-gold/40"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl aspect-square animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((product) => (
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
        <p className="text-muted-foreground text-center py-12">لا توجد منتجات</p>
      )}
    </div>
  );
}

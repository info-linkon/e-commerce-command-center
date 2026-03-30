import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import catTeaCoffee from "@/assets/cat-tea-coffee.jpg";
import catSeating from "@/assets/cat-seating.jpg";
import catEquipment from "@/assets/cat-equipment.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catPackages from "@/assets/cat-packages.jpg";
import catStoves from "@/assets/cat-stoves.jpg";
import catCampingGear from "@/assets/cat-camping-gear.jpg";
import { useState } from "react";

const categoryImageMap: Record<string, string> = {
  "1e7e7bc7-16e4-40b4-a8be-679c5831f8aa": catTeaCoffee,
  "12810207-4acf-4832-80ef-7b9647f72447": catSeating,
  "aa84fa63-af44-45d1-a3fc-c78b96231084": catEquipment,
  "7da81997-1aec-48fa-9098-e725043ee875": catTents,
  "03aa2ad2-ece8-4a4a-83b5-79776d7f3b5a": catPackages,
  "0b71a53a-8729-4773-8a39-87dabce93171": catStoves,
  "684b6a05-c8f9-4199-b7d2-09cf8005dcc3": catCampingGear,
};

export default function WebShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const { data: products, isLoading } = useWebProducts(selectedCategory);
  const { data: categories } = useWebCategories();
  const [showAll, setShowAll] = useState(false);

  // Default: show categories grid. "الكل" shows all products.
  if (!showAll) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">المتجر</h1>
        <p className="text-muted-foreground mb-8">اختر القسم المطلوب</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {categories?.map((cat) => {
            const imgSrc = categoryImageMap[cat.id] || (cat as any).image_url;
            return (
              <Link
                key={cat.id}
                to={`/web/category/${(cat as any).category_number || cat.id}`}
                className="group relative rounded-xl overflow-hidden aspect-square border border-border hover:shadow-xl transition-all duration-300"
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    width={800}
                    height={800}
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-lg drop-shadow-lg">{cat.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowAll(true)}
            className="font-bold"
          >
            عرض جميع المنتجات
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">جميع المنتجات</h1>
        <Button variant="ghost" onClick={() => { setShowAll(false); setSelectedCategory(undefined); }} className="text-muted-foreground">
          العودة للأقسام
        </Button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide flex-nowrap">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap shrink-0 ${
            !selectedCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/50"
          }`}
        >
          الكل
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl aspect-square animate-pulse border border-border" />
          ))}
        </div>
      ) : products?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <WebProductCard
              key={product.id}
              id={product.id}
              productNumber={(product as any).product_number}
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

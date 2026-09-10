import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { Link, useSearchParams } from "react-router-dom";
import { Seo } from "@/components/web/Seo";
import { useLanguage } from "@/hooks/useLanguage";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import catTeaCoffee from "@/assets/cat-tea-coffee.jpg";
import catSeating from "@/assets/cat-seating.jpg";
import catEquipment from "@/assets/cat-equipment.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catPackages from "@/assets/cat-packages.jpg";
import catStoves from "@/assets/cat-stoves.jpg";
import catCampingGear from "@/assets/cat-camping-gear.jpg";
import { useEffect, useState } from "react";
import { gaViewItemList } from "@/lib/gtag";

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
  // Filter + view state live in the URL so returning from a product page
  // (browser back) restores exactly the same catalog view.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("cat") || undefined;
  const showAll = searchParams.get("all") === "1" || !!selectedCategory;

  const setSelectedCategory = (catId?: string) => {
    const next = new URLSearchParams(searchParams);
    if (catId) next.set("cat", catId);
    else next.delete("cat");
    next.set("all", "1");
    setSearchParams(next, { replace: true });
  };
  const setShowAll = (value: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("all", "1");
    else {
      next.delete("all");
      next.delete("cat");
    }
    setSearchParams(next, { replace: true });
  };

  const { data: products, isLoading } = useWebProducts(selectedCategory);
  const { data: categories } = useWebCategories();
  const { lang, t, localizedPath } = useLanguage();

  // GA4: view_item_list when viewing the "all products" grid
  useEffect(() => {
    if (!showAll || !products || products.length === 0) return;
    gaViewItemList("shop_all", products.slice(0, 20).map((p: any) => ({
      item_id: p.sku || String(p.product_number || p.id),
      item_name: p.name_ar || p.name,
      item_category: p.categories?.name,
      price: p.sale_price,
    })));
  }, [showAll, products]);

  // Default: show categories grid. "الكل" shows all products.
  if (!showAll) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <Seo
          title={t("المتجر — أقسام معدات الرحلات", "החנות — קטגוריות ציוד לטיולים")}
          description={t(
            "تصفح أقسام متجر الوجهة: خيام، جلسات، مواقد، أطقم شاي وقهوة ومعدات تخييم.",
            "עיינו בקטגוריות של ELWEJHA: אוהלים, ישיבה, כיריים, ערכות תה וקפה וציוד קמפינג.",
          )}
          path="/shop"
        />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t("المتجر", "חנות")}</h1>
        <p className="text-muted-foreground mb-8">{t("اختر القسم المطلوب", "בחר קטגוריה")}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {categories?.map((cat) => {
            const imgSrc = (cat as any).image_url || categoryImageMap[cat.id];
            return (
              <Link
                key={cat.id}
                to={localizedPath(`/category/${(cat as any).slug || (cat as any).category_number || cat.id}`)}
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
                  <h3 className="font-bold text-white text-lg drop-shadow-lg">{lang === "he" ? ((cat as any).name_he || cat.name) : cat.name}</h3>
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
            {t("عرض جميع المنتجات", "הצג את כל המוצרים")}
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <Seo
        title={t("جميع المنتجات", "כל המוצרים")}
        description={t(
          "كل منتجات الوجهة لمعدات التخييم والرحلات في مكان واحد، مع توصيل لكل البلاد.",
          "כל מוצרי ELWEJHA לציוד קמפינג וטיולים במקום אחד, עם משלוח לכל הארץ.",
        )}
        path="/shop"
      />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("جميع المنتجات", "כל המוצרים")}</h1>
        <Button variant="ghost" onClick={() => setShowAll(false)} className="text-muted-foreground">
          {t("العودة للأقسام", "חזרה לקטגוריות")}
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
          {t("الكل", "הכל")}
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
            {lang === "he" ? ((cat as any).name_he || cat.name) : cat.name}
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
              slug={(product as any).slug}
              name={product.name}
              nameAr={product.name_ar}
              price={product.sale_price}
                  originalPrice={product.compare_at_price}
              imageUrl={product.image_url}
              categoryName={(product as any).categories?.name} categoryNameHe={(product as any).categories?.name_he}
              outOfStock={(product as any).outOfStock}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">{t("لا توجد منتجات", "אין מוצרים")}</p>
      )}
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useWebProductsByCategoryNumber } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect } from "react";
import { gaViewItemList } from "@/lib/gtag";

export default function WebCategoryPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  const categoryNumber = parseInt(id || "", 10);
  const { data, isLoading } = useWebProductsByCategoryNumber(isNaN(categoryNumber) ? undefined : categoryNumber);
  const products = data?.products || [];
  const category = data?.category;

  const categoryName = category
    ? (lang === "he" ? (category.name_he || category.name) : category.name)
    : t("المنتجات", "מוצרים");

  // GA4: view_item_list per category
  useEffect(() => {
    if (!products || products.length === 0) return;
    gaViewItemList(`category_${category?.name || categoryNumber}`, products.slice(0, 20).map((p: any) => ({
      item_id: p.sku || String(p.product_number || p.id),
      item_name: p.name_ar || p.name,
      item_category: category?.name,
      price: p.sale_price,
    })));
  }, [products, category?.name, categoryNumber]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">
        {categoryName}
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl aspect-square animate-pulse border border-border" />
          ))}
        </div>
      ) : products.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product: any) => (
            <WebProductCard
              key={product.id}
              id={product.id}
              productNumber={product.product_number}
              name={product.name}
              nameAr={product.name_ar}
              price={product.sale_price}
              imageUrl={product.image_url}
              categoryName={product.categories?.name} categoryNameHe={product.categories?.name_he}
              outOfStock={product.outOfStock}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">{t("لا توجد منتجات في هذا القسم", "אין מוצרים בקטגוריה זו")}</p>
      )}
    </div>
  );
}

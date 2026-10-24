import { useParams, useSearchParams } from "react-router-dom";
import { useWebProductsByCategoryNumber, useWebPopularityRanking } from "@/hooks/useWebProducts";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useLanguage } from "@/hooks/useLanguage";
import { WebBreadcrumb } from "@/components/web/WebBreadcrumb";
import { useEffect, useMemo } from "react";
import { gaViewItemList } from "@/lib/gtag";
import { Seo } from "@/components/web/Seo";
import { parseProductSort, sortProducts, type ProductSort } from "@/lib/product-sort";

export default function WebCategoryPage() {
  const { lang, t } = useLanguage();
  const { id } = useParams();
  // `id` may be the numeric category_number or a custom slug
  const categoryNumber = id;
  const { data, isLoading } = useWebProductsByCategoryNumber(id);
  const category = data?.category;
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = parseProductSort(searchParams.get("sort"));
  const { data: ranking } = useWebPopularityRanking();
  const products = useMemo(
    () => sortProducts((data?.products || []) as any[], sort, ranking || []),
    [data?.products, sort, ranking],
  );
  const setSort = (value: ProductSort) => {
    const next = new URLSearchParams(searchParams);
    if (value === "popular") next.delete("sort");
    else next.set("sort", value);
    setSearchParams(next, { replace: true });
  };
  const sortOptions: { value: ProductSort; label: string }[] = [
    { value: "popular", label: t("الأكثر مبيعاً", "הכי נמכרים") },
    { value: "price_asc", label: t("السعر: من الأقل", "מחיר: מהנמוך") },
    { value: "price_desc", label: t("السعر: من الأعلى", "מחיר: מהגבוה") },
    { value: "newest", label: t("الأحدث", "הכי חדשים") },
  ];

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
      <Seo
        title={
          (lang === "he"
            ? (category as any)?.meta_title_he || (category as any)?.meta_title
            : (category as any)?.meta_title || (category as any)?.meta_title_he) || categoryName
        }
        description={
          (lang === "he"
            ? (category as any)?.meta_description_he || (category as any)?.meta_description
            : (category as any)?.meta_description || (category as any)?.meta_description_he) ||
          t(
            `تسوق ${categoryName} من الوجهة — معدات رحلات وتخييم بأفضل الأسعار وتوصيل لكل البلاد.`,
            `קנו ${categoryName} ב-ELWEJHA — ציוד קמפינג וטבע במחירים משתלמים ומשלוח לכל הארץ.`,
          )
        }
        path={`/category/${(category as any)?.slug || (category as any)?.category_number || categoryNumber}`}
      />
      <WebBreadcrumb
        items={[
          { label: t("المتجر", "חנות"), to: "/shop" },
          { label: categoryName },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {categoryName}
        </h1>
        {products.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("ترتيب حسب", "מיון לפי")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSort)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

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
              slug={(product as any).slug}
              name={product.name}
              nameAr={product.name_ar}
              price={product.sale_price}
                  originalPrice={product.compare_at_price}
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

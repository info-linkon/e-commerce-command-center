import { Link } from "react-router-dom";
import { BannerSlider } from "@/components/web/BannerSlider";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { Truck, Shield, Headphones } from "lucide-react";

export default function WebHome() {
  const { data: products } = useWebProducts();
  const { data: categories } = useWebCategories();

  const featured = products?.slice(0, 8) || [];

  return (
    <div>
      <BannerSlider />

      {/* Hero fallback if no banners */}
      <section className="bg-[hsl(30,15%,8%)] text-white py-4">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center gap-2 py-4">
            <Truck className="h-8 w-8 text-[hsl(36,56%,51%)]" />
            <h3 className="font-semibold">توصيل سريع</h3>
            <p className="text-sm text-gray-400">توصيل لجميع المناطق</p>
          </div>
          <div className="flex flex-col items-center gap-2 py-4">
            <Shield className="h-8 w-8 text-[hsl(36,56%,51%)]" />
            <h3 className="font-semibold">منتجات أصلية</h3>
            <p className="text-sm text-gray-400">ضمان الجودة والأصالة</p>
          </div>
          <div className="flex flex-col items-center gap-2 py-4">
            <Headphones className="h-8 w-8 text-[hsl(36,56%,51%)]" />
            <h3 className="font-semibold">خدمة عملاء</h3>
            <p className="text-sm text-gray-400">دعم على مدار الساعة</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">الأقسام</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/web/category/${cat.id}`}
                  className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                >
                  <h3 className="font-medium text-gray-900">{cat.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">منتجات مميزة</h2>
            <Link to="/web/shop" className="text-[hsl(36,56%,51%)] font-medium hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((product) => (
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
        </div>
      </section>
    </div>
  );
}

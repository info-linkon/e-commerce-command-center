import { Link } from "react-router-dom";
import { BannerSlider } from "@/components/web/BannerSlider";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { Truck, Shield, Headphones, ArrowLeft } from "lucide-react";

export default function WebHome() {
  const { data: products } = useWebProducts();
  const { data: categories } = useWebCategories();

  const featured = products?.slice(0, 8) || [];

  return (
    <div>
      <BannerSlider />

      {/* Features strip */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-border">
          {[
            { icon: Truck, title: "توصيل سريع", desc: "توصيل لجميع المناطق" },
            { icon: Shield, title: "منتجات أصلية", desc: "ضمان الجودة والأصالة" },
            { icon: Headphones, title: "خدمة عملاء", desc: "دعم على مدار الساعة" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 py-5 px-6 justify-center">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-14 web-sand-gradient">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">الأقسام</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/web/category/${cat.id}`}
                  className="bg-card rounded-xl p-6 text-center shadow-sm border border-border hover:shadow-lg hover:-translate-y-1 hover:border-gold/40 transition-all duration-300"
                >
                  <h3 className="font-medium text-card-foreground">{cat.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-14 bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">منتجات مميزة</h2>
            <Link to="/web/shop" className="text-gold font-medium hover:underline flex items-center gap-1 group">
              عرض الكل
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
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

      {/* CTA */}
      <section className="web-desert-gradient py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-sand mb-4">اكتشف مجموعتنا الكاملة</h2>
          <p className="text-sand/70 mb-8 text-lg">منتجات أصلية بأفضل الأسعار مع توصيل سريع لباب بيتك</p>
          <Link
            to="/web/shop"
            className="inline-block px-10 py-4 web-gold-gradient text-white rounded-full font-medium text-lg hover:opacity-90 transition-opacity shadow-lg"
          >
            تسوق الآن
          </Link>
        </div>
      </section>
    </div>
  );
}

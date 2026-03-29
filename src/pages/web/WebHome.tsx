import { Link } from "react-router-dom";
import { BannerSlider } from "@/components/web/BannerSlider";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { Truck, Shield, Headphones, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";

export default function WebHome() {
  const { data: products } = useWebProducts();
  const { data: categories } = useWebCategories();

  const featured = products?.slice(0, 8) || [];

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-desert" />
          <div className="absolute inset-0 bg-gradient-to-l from-[hsl(30,30%,15%)]/95 via-[hsl(30,30%,15%)]/70 to-transparent" />
        </div>
        <div className="container py-16 md:py-28 relative z-10 text-desert-foreground">
          <div className="max-w-2xl">
            <span className="inline-block bg-gold/20 text-gold px-4 py-1.5 rounded-full text-sm font-medium mb-6 animate-fade-in">
              ✨ أهلاً بك في الوجهة
            </span>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              منتجات أصلية
              <br />
              <span className="text-gradient-gold">بأفضل الأسعار</span>
            </h1>
            <p className="text-desert-foreground/70 text-lg md:text-xl mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
              اكتشف مجموعتنا المتميزة من المنتجات الأصلية مع توصيل سريع لباب بيتك
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-8">
                <Link to="/web/shop">
                  تسوق الآن
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/50 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:text-white font-bold text-base">
                <Link to="/web/about">من نحن</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Slider */}
      <BannerSlider />

      {/* Features Strip */}
      <section className="bg-card border-b border-border">
        <div className="container py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Truck, title: "توصيل سريع", desc: "توصيل لجميع المناطق" },
              { icon: Shield, title: "منتجات أصلية", desc: "ضمان الجودة والأصالة" },
              { icon: Headphones, title: "خدمة عملاء", desc: "دعم على مدار الساعة" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 justify-center">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{title}</h4>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="container py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">الأقسام</h2>
              <p className="text-muted-foreground text-sm mt-1">تصفح حسب القسم</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/web/category/${cat.id}`}
                className="bg-card rounded-xl p-6 text-center border border-border hover:shadow-lg hover:-translate-y-1 hover:border-gold/40 transition-all duration-300"
              >
                <h3 className="font-medium text-card-foreground">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="bg-sand-gradient">
        <div className="container py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">منتجات مميزة</h2>
              <p className="text-muted-foreground text-sm mt-1">أحدث المنتجات في متجرنا</p>
            </div>
            <Button asChild variant="ghost" className="text-primary hover:text-gold">
              <Link to="/web/shop">
                عرض الكل
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
      <section className="bg-desert-gradient text-desert-foreground">
        <div className="container py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">اكتشف مجموعتنا الكاملة</h2>
          <p className="text-desert-foreground/70 mb-8 max-w-lg mx-auto">
            منتجات أصلية بأفضل الأسعار مع توصيل سريع لباب بيتك
          </p>
          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold px-8">
            <Link to="/web/shop">تسوق الآن</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

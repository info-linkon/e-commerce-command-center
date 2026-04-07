import { Link } from "react-router-dom";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useWebProducts, useWebCategories } from "@/hooks/useWebProducts";
import { useSiteSection } from "@/hooks/useSiteContent";
import { useBannersPublic } from "@/hooks/useBannersPublic";
import { defaultContent } from "@/lib/web-default-content";
import { Truck, Shield, ShoppingBag, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef, useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import type { CarouselApi } from "@/components/ui/carousel";
import heroBg from "@/assets/hero-bg.jpg";
import catTeaCoffee from "@/assets/cat-tea-coffee.jpg";
import catSeating from "@/assets/cat-seating.jpg";
import catEquipment from "@/assets/cat-equipment.jpg";
import catTents from "@/assets/cat-tents.jpg";
import catPackages from "@/assets/cat-packages.jpg";
import catStoves from "@/assets/cat-stoves.jpg";
import catCampingGear from "@/assets/cat-camping-gear.jpg";

const categoryImageMap: Record<string, string> = {
  "1e7e7bc7-16e4-40b4-a8be-679c5831f8aa": catTeaCoffee,
  "12810207-4acf-4832-80ef-7b9647f72447": catSeating,
  "aa84fa63-af44-45d1-a3fc-c78b96231084": catEquipment,
  "7da81997-1aec-48fa-9098-e725043ee875": catTents,
  "03aa2ad2-ece8-4a4a-83b5-79776d7f3b5a": catPackages,
  "0b71a53a-8729-4773-8a39-87dabce93171": catStoves,
  "684b6a05-c8f9-4199-b7d2-09cf8005dcc3": catCampingGear,
};

export default function WebHome() {
  const { data: products } = useWebProducts();
  const { data: categories } = useWebCategories();
  const { lang, t } = useLanguage();
  const { data: banners } = useBannersPublic();

  const { data: heroData } = useSiteSection("home", "hero");
  const hero = {
    ...defaultContent.home.hero,
    ...((heroData?.content as Record<string, any>) || {}),
  };

  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const featured = products?.slice(0, 8) || [];

  // Build slides from banners, fallback to hero CMS data
  const slides = banners && banners.length > 0
    ? banners.map((b) => ({
        image: b.image_url || heroBg,
        title: b.title || "",
        subtitle: b.subtitle || "",
        link: b.link || "",
      }))
    : [{
        image: hero.backgroundImage || heroBg,
        title: hero.title || "وجهتك الأولى",
        subtitle: hero.subtitle || "لعالم الطبيعة والمغامرات",
        link: "",
      }];

  return (
    <div>
      {/* Hero Carousel */}
      <section className="relative overflow-hidden aspect-[3/2]">
        <Carousel
          opts={{ loop: true, direction: "rtl" }}
          plugins={[plugin.current]}
          setApi={setApi}
          className="w-full h-full"
        >
          <CarouselContent className="-ml-0 h-full">
            {slides.map((slide, i) => (
              <CarouselItem key={i} className="pl-0 h-full">
                <div className="relative w-full h-full flex items-center">
                  <img
                    src={slide.image}
                    alt={slide.title || "באנר"}
                    className="absolute inset-0 w-full h-full object-cover"
                    width={1920}
                    height={1080}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-[hsl(30,30%,15%)]/95 via-[hsl(30,30%,15%)]/70 to-[hsl(30,30%,15%)]/40" />
                  <div className="container relative z-10 text-desert-foreground py-10 md:py-28">
                    <div className="max-w-2xl">
                      <span className="inline-block bg-gold/20 text-gold px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-fade-in">
                        ✨ {t("أهلاً بك في الوجهة", "ברוכים הבאים ליעד")}
                      </span>
                      {slide.title && (
                        <h1 className="text-2xl md:text-5xl lg:text-6xl font-black leading-tight mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                          {slide.title}
                          {slide.subtitle && (
                            <>
                              <br />
                              <span className="text-gradient-gold">{slide.subtitle}</span>
                            </>
                          )}
                        </h1>
                      )}
                      <p className="text-desert-foreground/70 text-sm md:text-xl mb-6 md:mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {t("مستلزمات تخييم ورحلات بأسلوب شرقي أصيل — توصيل لجميع المناطق", "ציוד קמפינג וטיולים בסגנון מזרחי מקורי — משלוחים לכל האזורים")}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-8">
                          <Link to={slide.link || hero.cta_link || "/web/shop"}>
                            {t(hero.cta_text || "تسوق الآن", hero.cta_text_he || "קנה עכשיו")}
                            <ArrowLeft className="w-4 h-4 mr-2" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="border-white/50 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:text-white font-bold text-base">
                          <Link to="/web/about">{t("من نحن", "אודותינו")}</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation arrows + dots */}
          {slides.length > 1 && (
            <>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => api?.scrollTo(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === current ? 'bg-gold' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </Carousel>
      </section>

      {/* Features Strip */}
      <section className="bg-card border-b border-border">
        <div className="container py-4 md:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Shield, title: "رضاك مضمون", desc: "ضمان 100% على جميع المنتجات" },
              { icon: ShoppingBag, title: "سهولة الشراء", desc: "تجربة تسوق سهلة وسريعة" },
              { icon: Truck, title: "توصيل سريع", desc: "توصيل لكافة المناطق" },
              { icon: RefreshCw, title: "إمكانية الإرجاع", desc: "إرجاع سهل ومريح" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 justify-center">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-bold text-xs md:text-sm">{title}</h4>
                  <p className="text-xs text-muted-foreground hidden md:block">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories with Images */}
      {categories && categories.length > 0 && (
        <section className="container py-8 md:py-16">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-bold">{t("الأقسام", "קטגוריות")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("تصفح حسب القسم", "עיון לפי קטגוריה")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
            {categories.map((cat) => {
              const imgSrc = (cat as any).image_url || categoryImageMap[cat.id];
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
        </section>
      )}

      {/* Featured Products */}
      <section className="bg-sand-gradient">
        <div className="container py-8 md:py-16">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-bold">منتجات مميزة</h2>
              <p className="text-muted-foreground text-sm mt-1">أحدث المنتجات في متجرنا</p>
            </div>
            <Button asChild variant="ghost" className="text-primary hover:text-gold">
              <Link to="/web/shop">
                عرض الكل
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {featured.map((product) => (
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

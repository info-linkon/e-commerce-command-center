import { Link } from "react-router-dom";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useWebProducts, useWebCategories, useWebFeaturedProducts, useWebBestSellers } from "@/hooks/useWebProducts";
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
  const { data: featuredProducts } = useWebFeaturedProducts();
  const { data: bestSellers } = useWebBestSellers();
  const { data: categories } = useWebCategories();
  const { lang, t, localizedPath } = useLanguage();
  const { data: banners, isLoading: bannersLoading } = useBannersPublic();

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

  // Use featured products if available, otherwise fall back to latest 8
  const featured = (featuredProducts && featuredProducts.length > 0) ? featuredProducts : (products?.slice(0, 8) || []);

  // Build slides from banners only (no fallback hero during loading)
  const slides = banners && banners.length > 0
    ? banners.map((b: any) => ({
        image: b.image_url || heroBg,
        title: lang === "he" ? (b.title_he || b.title || "") : (b.title || ""),
        subtitle: lang === "he" ? (b.subtitle_he || b.subtitle || "") : (b.subtitle || ""),
        badge: lang === "he" ? (b.badge_he || b.badge || "") : (b.badge || ""),
        description: lang === "he" ? (b.description_he || b.description || "") : (b.description || ""),
        link: b.link || "",
      }))
    : [];

  return (
    <div>
      {/* Hero Carousel */}
      {bannersLoading ? (
        <section className="relative overflow-hidden aspect-[3/2] bg-muted animate-pulse" />
      ) : slides.length > 0 ? (
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
                        {slide.badge && (
                          <span className="inline-block bg-gold/20 text-gold px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 animate-fade-in">
                            ✨ {slide.badge}
                          </span>
                        )}
                        {slide.title && (
                          <h1 className="text-2xl md:text-5xl lg:text-6xl font-black leading-relaxed mb-4 md:mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            {slide.title}
                            {slide.subtitle && (
                              <>
                                <br />
                                <span className="text-gradient-gold block mt-2 md:mt-4">{slide.subtitle}</span>
                              </>
                            )}
                          </h1>
                        )}
                        {slide.description && (
                          <p className="text-desert-foreground/70 text-sm md:text-xl mb-6 md:mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            {slide.description}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold text-base px-8">
                            <Link to={slide.link || hero.cta_link || "/shop"}>
                              {t(hero.cta_text || "تسوق الآن", hero.cta_text_he || "קנה עכשיו")}
                              <ArrowLeft className="w-4 h-4 mr-2" />
                            </Link>
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
      ) : null}

      {/* Features Strip */}
      <section className="bg-card border-b border-border">
        <div className="container py-4 md:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Shield, title: t("رضاك مضمون", "שביעות רצון מובטחת"), desc: t("ضمان 100% على جميع المنتجات", "אחריות 100% על כל המוצרים") },
              { icon: ShoppingBag, title: t("سهولة الشراء", "קנייה קלה"), desc: t("تجربة تسوق سهلة وسريعة", "חווית קנייה קלה ומהירה") },
              { icon: Truck, title: t("توصيل سريع", "משלוח מהיר"), desc: t("توصيل لكافة المناطق", "משלוח לכל האזורים") },
              { icon: RefreshCw, title: t("إمكانية الإرجاع", "אפשרות החזרה"), desc: t("إرجاع سهل ومريح", "החזרה קלה ונוחה") },
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
                  to={`/category/${(cat as any).category_number || cat.id}`}
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
        </section>
      )}

      {/* Featured Products */}
      <section className="bg-sand-gradient">
        <div className="container py-8 md:py-16">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-bold">{t("منتجات مميزة", "מוצרים מומלצים")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("أحدث المنتجات في متجرنا", "המוצרים החדשים בחנות")}</p>
            </div>
            <Button asChild variant="ghost" className="text-primary hover:text-gold">
              <Link to={localizedPath("/shop")}>
                {t("عرض الكل", "הצג הכל")}
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

      {/* Best Sellers */}
      {bestSellers && bestSellers.length > 0 && (
        <section className="container py-8 md:py-16">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h2 className="text-xl md:text-3xl font-bold">{t("الأكثر مبيعاً", "רב מכר")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("المنتجات الأكثر طلباً", "המוצרים הנמכרים ביותר")}</p>
            </div>
            <Button asChild variant="ghost" className="text-primary hover:text-gold">
              <Link to={localizedPath("/shop")}>
                {t("عرض الكل", "הצג הכל")}
                <ArrowLeft className="w-4 h-4 mr-1" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {bestSellers.map((product) => (
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
        </section>
      )}

      {/* CTA */}
      <section className="bg-desert-gradient text-desert-foreground">
        <div className="container py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("اكتشف مجموعتنا الكاملة", "גלה את הקולקציה המלאה שלנו")}</h2>
          <p className="text-desert-foreground/70 mb-8 max-w-lg mx-auto">
            {t("منتجات أصلية بأفضل الأسعار مع توصيل سريع لباب بيتك", "מוצרים מקוריים במחירים הטובים ביותר עם משלוח מהיר עד הבית")}
          </p>
          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-bold px-8">
            <Link to={localizedPath("/shop")}>{t("تسوق الآن", "קנה עכשיו")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

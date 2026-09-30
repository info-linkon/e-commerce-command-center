import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useBannersPublic } from "@/hooks/useBannersPublic";
import { useLanguage } from "@/hooks/useLanguage";

export function PromoBannerCarousel() {
  const { data: banners } = useBannersPublic("featured_promo");
  const { lang, t, localizedPath } = useLanguage();
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const visibleBanners = banners?.filter((banner) => banner.image_url) ?? [];

  useEffect(() => {
    if (!api) return;

    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on("select", updateCurrent);
    api.on("reInit", updateCurrent);

    return () => {
      api.off("select", updateCurrent);
      api.off("reInit", updateCurrent);
    };
  }, [api]);

  if (!visibleBanners.length) return null;

  return (
    <section className="w-full py-5 md:py-8">
      <Carousel
        opts={{ loop: visibleBanners.length > 1, direction: "rtl" }}
        plugins={visibleBanners.length > 1 ? [autoplay.current] : []}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {visibleBanners.map((banner, index) => {
            const title = (lang === "he" ? banner.title_he || banner.title : banner.title || banner.title_he) || t("عرض خاص", "מבצע מיוחד");
            const subtitle = lang === "he" ? banner.subtitle_he || banner.subtitle : banner.subtitle || banner.subtitle_he;
            const description = lang === "he" ? banner.description_he || banner.description : banner.description || banner.description_he;

            return (
              <CarouselItem key={banner.id} className="pl-0">
                <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                  <picture className="block h-full w-full">
                {banner.mobile_image_url && <source media="(max-width: 767px)" srcSet={banner.mobile_image_url} />}
                <img
                  src={banner.image_url || ""}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  loading={index === 0 ? "eager" : "lazy"}
                  width={1584}
                  height={672}
                />
                  </picture>
                  <div className="absolute inset-0 bg-gradient-to-l from-desert/90 via-desert/55 to-transparent" />
                  <div className="container absolute inset-0 z-10 flex items-center py-6 md:py-12">
                    <div className="max-w-xl text-desert-foreground">
                      <h2 className="text-2xl font-black leading-relaxed md:text-5xl">{title}</h2>
                      {subtitle && <p className="mt-1 text-base font-bold md:mt-3 md:text-2xl">{subtitle}</p>}
                      {description && <p className="mt-2 hidden max-w-lg text-sm text-desert-foreground/80 sm:block md:mt-4 md:text-lg">{description}</p>}
                  {banner.link ? (
                        <Button asChild size="lg" className="mt-4 bg-gold font-bold text-gold-foreground hover:bg-gold/90 md:mt-6">
                          <Link to={localizedPath(banner.link.startsWith("/") ? banner.link : `/${banner.link}`)}>
                            {t("تسوق الآن", "לקנייה")}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {visibleBanners.length > 1 && (
          <>
            <CarouselPrevious className="left-3 hidden border-border bg-background/85 md:inline-flex" />
            <CarouselNext className="right-3 hidden border-border bg-background/85 md:inline-flex" />
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2" dir="ltr">
              {visibleBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  className={`h-2.5 rounded-full border border-background/70 transition-all ${index === current ? "w-7 bg-gold" : "w-2.5 bg-background/70"}`}
                  aria-label={t(`انتقل إلى البانر ${index + 1}`, `עבור לבאנר ${index + 1}`)}
                  aria-current={index === current ? "true" : undefined}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>
    </section>
  );
}
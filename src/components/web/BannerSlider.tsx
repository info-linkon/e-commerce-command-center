import { useBannersPublic } from "@/hooks/useBannersPublic";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

export function BannerSlider() {
  const { data: banners } = useBannersPublic();
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  if (!banners?.length) return null;

  return (
    <section className="w-full">
      <Carousel
        opts={{ loop: true, direction: "rtl" }}
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent>
          {banners.map((banner) => {
            const content = (
              <div className="relative w-full aspect-[3/1] md:aspect-[4/1] bg-muted overflow-hidden">
                {banner.image_url && (
                  <img
                    src={banner.image_url}
                    alt={banner.title || ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent flex items-end">
                  <div className="container pb-6 md:pb-10 text-white">
                    {banner.title && <h3 className="text-lg md:text-2xl font-bold">{banner.title}</h3>}
                    {banner.subtitle && (
                      <p className="text-sm md:text-base opacity-90 mt-1">{banner.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>
            );

            return (
              <CarouselItem key={banner.id} className="pl-0">
                {banner.link ? (
                  <Link to={banner.link}>{content}</Link>
                ) : (
                  content
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-background/80" />
            <CarouselNext className="right-4 bg-background/80" />
          </>
        )}
      </Carousel>
    </section>
  );
}

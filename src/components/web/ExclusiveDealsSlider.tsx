import { useRef } from "react";
import { Flame } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useExclusiveDealsPublic } from "@/hooks/useExclusiveDeals";
import { useLanguage } from "@/hooks/useLanguage";

export function ExclusiveDealsSlider() {
  const { data: deals } = useExclusiveDealsPublic();
  const { t } = useLanguage();
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  if (!deals || deals.length === 0) return null;

  return (
    <section className="bg-gradient-to-b from-gold/5 to-transparent">
      <div className="container py-8 md:py-16">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 rounded-xl bg-gold/15 text-gold">
              <Flame className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-3xl font-bold">
                  {t("صفقات حصرية", "מבצעים מיוחדים")}
                </h2>
                <span className="hidden md:inline text-xs font-bold bg-gold text-gold-foreground px-2 py-0.5 rounded-full">
                  {t("حصري", "בלעדי")}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {t("عروض لفترة محدودة", "מבצעים לזמן מוגבל")}
              </p>
            </div>
          </div>
        </div>

        <Carousel
          opts={{ loop: deals.length > 4, direction: "rtl", align: "start", dragFree: true }}
          plugins={[plugin.current]}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-6">
            {deals.map((product: any) => (
              <CarouselItem
                key={product.id}
                className="pl-3 md:pl-6 basis-[65%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <WebProductCard
                  id={product.id}
                  productNumber={product.product_number}
                  name={product.name}
                  nameAr={product.name_ar}
                  price={product.sale_price}
                  originalPrice={product.compare_at_price}
                  imageUrl={product.image_url}
                  categoryName={product.categories?.name}
                  categoryNameHe={product.categories?.name_he}
                  outOfStock={product.outOfStock}
                  variationId={product.variationId}
                  variationName={product.variationName}
                  variationNameHe={product.variationNameHe}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {deals.length > 4 && (
            <>
              <CarouselPrevious className="hidden md:flex right-2 bg-background/90" />
              <CarouselNext className="hidden md:flex left-2 bg-background/90" />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
}
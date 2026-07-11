import { useRef } from "react";
import { Sparkles } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { WebProductCard } from "@/components/web/WebProductCard";
import { useRelatedProductsPublic } from "@/hooks/useRelatedProducts";
import { useLanguage } from "@/hooks/useLanguage";

export function RelatedProductsSection({ productId }: { productId: string | undefined }) {
  const { data: related } = useRelatedProductsPublic(productId);
  const { t } = useLanguage();
  const plugin = useRef(Autoplay({ delay: 6000, stopOnInteraction: true }));

  if (!related || related.length === 0) return null;

  return (
    <section className="border-t border-border mt-8 md:mt-12 pt-8 md:pt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold">
          {t("منتجات ذات صلة", "מוצרים קשורים")}
        </h2>
      </div>
      <Carousel
        opts={{ loop: related.length > 4, direction: "rtl", align: "start", dragFree: true }}
        plugins={[plugin.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-3 md:-ml-6">
          {related.map((product: any) => (
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
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {related.length > 4 && (
          <>
            <CarouselPrevious className="hidden md:flex right-2 bg-background/90" />
            <CarouselNext className="hidden md:flex left-2 bg-background/90" />
          </>
        )}
      </Carousel>
    </section>
  );
}
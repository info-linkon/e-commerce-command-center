import { useBannersPublic } from "@/hooks/useBannersPublic";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function BannerSlider() {
  const { data: banners } = useBannersPublic();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!banners?.length) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners?.length]);

  if (!banners?.length) return null;

  const banner = banners[current];

  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-[hsl(30,15%,8%)]">
      {banner.image_url && (
        <img
          src={banner.image_url}
          alt={banner.title || ""}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
        {banner.title && (
          <h2 className="text-3xl md:text-5xl font-bold mb-3">{banner.title}</h2>
        )}
        {banner.subtitle && (
          <p className="text-lg md:text-xl text-gray-200 mb-6">{banner.subtitle}</p>
        )}
        {banner.link && (
          <Link
            to={banner.link}
            className="px-8 py-3 bg-[hsl(36,56%,51%)] text-white rounded-full font-medium hover:bg-[hsl(36,56%,45%)] transition-colors"
          >
            تسوق الآن
          </Link>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50 text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50 text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === current ? "bg-[hsl(36,56%,51%)]" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

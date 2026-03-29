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
    <div className="relative w-full h-[420px] md:h-[520px] overflow-hidden bg-desert">
      {banner.image_url && (
        <img
          src={banner.image_url}
          alt={banner.title || ""}
          className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-700"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4 animate-fade-in">
        {banner.title && (
          <h2 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">{banner.title}</h2>
        )}
        {banner.subtitle && (
          <p className="text-lg md:text-xl text-sand/90 mb-8 max-w-2xl">{banner.subtitle}</p>
        )}
        {banner.link && (
          <Link
            to={banner.link}
            className="px-8 py-3.5 web-gold-gradient text-white rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg"
          >
            تسوق الآن
          </Link>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-card/20 backdrop-blur-sm rounded-full hover:bg-card/40 text-white transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-card/20 backdrop-blur-sm rounded-full hover:bg-card/40 text-white transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "bg-gold w-8" : "bg-white/40 w-2"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

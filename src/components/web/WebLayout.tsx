import { Outlet, useLocation } from "react-router-dom";
import { WebHeader } from "./WebHeader";
import { WebFooter } from "./WebFooter";
import { WebBottomNav } from "./WebBottomNav";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSiteSection } from "@/hooks/useSiteContent";
import { fbqPageView } from "@/lib/meta-pixel";
import { ttqPageView } from "@/lib/tiktok-pixel";
import { gaPageView } from "@/lib/gtag";
import { LanguageProvider, useLanguage } from "@/hooks/useLanguage";
import { useVersionCheck } from "@/hooks/useVersionCheck";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function WebLayoutInner() {
  const { data: pixelSettings } = useSiteSection("settings", "meta_pixel");
  const { data: tiktokSettings } = useSiteSection("settings", "tiktok_pixel");
  const { data: settingsData } = useSiteSection("settings", "general");
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  const pixelInitialized = useRef(false);
  const tiktokInitialized = useRef(false);
  useVersionCheck();

  const settings = (settingsData?.content || {}) as any;
  const whatsapp = settings.whatsapp || "972526573185";

  // Initialize pixel with retry
  useEffect(() => {
    const pixelId = (pixelSettings?.content as any)?.pixel_id;
    if (!pixelId || pixelInitialized.current) return;

    const tryInit = (attempts = 0) => {
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("init", pixelId);
        fbqPageView();
        pixelInitialized.current = true;
      } else if (attempts < 20) {
        setTimeout(() => tryInit(attempts + 1), 500);
      }
    };
    tryInit();
  }, [pixelSettings]);

  // Initialize TikTok Pixel with retry
  useEffect(() => {
    const tiktokPixelId = (tiktokSettings?.content as any)?.pixel_id;
    if (!tiktokPixelId || tiktokInitialized.current) return;

    const tryInit = (attempts = 0) => {
      if (typeof window !== "undefined" && (window as any).ttq && typeof (window as any).ttq.load === "function") {
        (window as any).ttq.load(tiktokPixelId);
        (window as any).ttq.page();
        tiktokInitialized.current = true;
      } else if (attempts < 20) {
        setTimeout(() => tryInit(attempts + 1), 500);
      }
    };
    tryInit();
  }, [tiktokSettings]);

  // Track page views on route change
  useEffect(() => {
    if (pixelInitialized.current) {
      fbqPageView();
    }
    if (tiktokInitialized.current) {
      ttqPageView();
    }
  }, [pathname]);

  // GA4 page_view on every SPA route change (gtag loaded in index.html with send_page_view:false)
  useEffect(() => {
    gaPageView(pathname + window.location.search);
  }, [pathname]);

  // Render noscript pixel fallback
  const pixelId = (pixelSettings?.content as any)?.pixel_id;
  const tiktokPixelId = (tiktokSettings?.content as any)?.pixel_id;

  return (
    <div className="min-h-screen flex flex-col bg-sand" dir="rtl">
      <ScrollToTop />
      <WebHeader />
      <main className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>
      <WebFooter />
      <WebBottomNav />

      {/* Noscript pixel fallback */}
      {pixelId && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}

      {/* TikTok noscript pixel fallback */}
      {tiktokPixelId && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://analytics.tiktok.com/api/v2/pixel?sdkid=${tiktokPixelId}&event=Pageview`}
            alt=""
          />
        </noscript>
      )}

      {/* WhatsApp float */}
      <a
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[4.5rem] md:bottom-6 left-4 md:left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-200"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
      </a>
    </div>
  );
}

export function WebLayout() {
  return (
    <LanguageProvider>
      <WebLayoutInner />
    </LanguageProvider>
  );
}

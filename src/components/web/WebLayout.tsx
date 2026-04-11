import { Outlet, useLocation } from "react-router-dom";
import { WebHeader } from "./WebHeader";
import { WebFooter } from "./WebFooter";
import { WebBottomNav } from "./WebBottomNav";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSiteSection } from "@/hooks/useSiteContent";
import { fbqPageView } from "@/lib/meta-pixel";
import { LanguageProvider, useLanguage } from "@/hooks/useLanguage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function WebLayoutInner() {
  const { data: pixelSettings } = useSiteSection("settings", "meta_pixel");
  const { data: settingsData } = useSiteSection("settings", "general");
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  const pixelInitialized = useRef(false);

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

  // Track page views on route change
  useEffect(() => {
    if (pixelInitialized.current) {
      fbqPageView();
    }
  }, [pathname]);

  // Render noscript pixel fallback
  const pixelId = (pixelSettings?.content as any)?.pixel_id;

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

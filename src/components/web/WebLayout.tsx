import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import { WebHeader } from "./WebHeader";
import { WebFooter } from "./WebFooter";
import { WebBottomNav } from "./WebBottomNav";
import { MessageCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useSiteSection } from "@/hooks/useSiteContent";
import { fbqPageView, setMetaPixelId, buildMatchData, loadIdentity, getExternalId } from "@/lib/meta-pixel";
import { ttqPageView, ttqIdentify } from "@/lib/tiktok-pixel";
import { gaPageView } from "@/lib/gtag";
import { LanguageProvider, useLanguage } from "@/hooks/useLanguage";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { captureClickIds } from "@/lib/attribution";

// Scroll position per history entry, so Back (e.g. product → category) returns
// to where the customer was instead of the top of the page.
const scrollPositions = new Map<string, number>();

function ScrollManager() {
  const { pathname, key } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  // Layout effect: the old entry's listener is removed during the commit, before
  // the browser fires the scroll event caused by the new, shorter page.
  useLayoutEffect(() => {
    const save = () => scrollPositions.set(key, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [key]);

  useEffect(() => {
    const target = navType === "POP" ? scrollPositions.get(key) : undefined;
    if (!target) {
      window.scrollTo(0, 0);
      return;
    }
    // The list may still be rendering (images, async data) — retry until the
    // page is tall enough to reach the saved position, for up to ~2s.
    let tries = 0;
    let frame = 0;
    const restore = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      if (maxY >= target || tries++ > 120) {
        window.scrollTo(0, Math.min(target, maxY));
        return;
      }
      frame = requestAnimationFrame(restore);
    };
    restore();
    return () => cancelAnimationFrame(frame);
  }, [pathname, key, navType]);

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
  const isCheckoutPage = /\/checkout(\/|$)/.test(pathname);
  const isProductPage = /\/product\//.test(pathname);
  const whatsapp = settings.whatsapp || "972526573185";

  // Initialize pixel with retry
  useEffect(() => {
    const pixelId = (pixelSettings?.content as any)?.pixel_id;
    if (!pixelId || pixelInitialized.current) return;

    const tryInit = (attempts = 0) => {
      if (typeof window !== "undefined" && window.fbq) {
        setMetaPixelId(pixelId);
        // Init with advanced matching: stable external id + any remembered
        // customer email/phone, so every event carries identifying data.
        window.fbq("init", pixelId, buildMatchData(loadIdentity()));
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
        const saved = loadIdentity();
        ttqIdentify({ email: saved.email, phone: saved.phone, external_id: getExternalId() });
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
    captureClickIds();
    gaPageView(pathname + window.location.search);
  }, [pathname]);

  // Render noscript pixel fallback
  const pixelId = (pixelSettings?.content as any)?.pixel_id;
  const tiktokPixelId = (tiktokSettings?.content as any)?.pixel_id;

  return (
    <div className="min-h-screen flex flex-col bg-sand" dir="rtl">
      <ScrollManager />
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

      {/* WhatsApp float — hidden on checkout (it covered the "pay now" button
          on phones) and lifted above the sticky add-to-cart bar on product pages. */}
      {!isCheckoutPage && <a
        data-web-floating
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed ${isProductPage ? "bottom-[8.5rem]" : "bottom-[4.5rem]"} md:bottom-6 left-4 md:left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-200`}
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
      </a>}
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

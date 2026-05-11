import { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Lang = "ar" | "he";

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (ar: string | undefined | null, he: string | undefined | null) => string;
  localizedPath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  toggleLang: () => {},
  t: (ar) => ar || "",
  localizedPath: (p) => p,
});

function detectLang(pathname: string): Lang {
  return pathname === "/he" || pathname.startsWith("/he/") ? "he" : "ar";
}

function stripPrefix(pathname: string): string {
  if (pathname === "/he") return "/";
  if (pathname.startsWith("/he/")) return pathname.slice(3);
  return pathname;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lang: Lang = detectLang(location.pathname);

  useEffect(() => {
    try {
      localStorage.setItem("site_lang", lang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "he" ? "he" : "ar";
    }
  }, [lang]);

  const localizedPath = (path: string) => {
    if (lang !== "he") return path;
    if (path === "/") return "/he";
    if (path.startsWith("/he")) return path;
    return "/he" + (path.startsWith("/") ? path : "/" + path);
  };

  const toggleLang = () => {
    const base = stripPrefix(location.pathname);
    const next = lang === "ar"
      ? (base === "/" ? "/he" : "/he" + base)
      : base;
    navigate(next + location.search + location.hash);
  };

  const t = (ar: string | undefined | null, he: string | undefined | null) => {
    if (lang === "he" && he) return he;
    return ar || "";
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, localizedPath }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

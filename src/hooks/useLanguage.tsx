import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ar" | "he";

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (ar: string | undefined | null, he: string | undefined | null) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  toggleLang: () => {},
  t: (ar) => ar || "",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("site_lang");
    return saved === "he" ? "he" : "ar";
  });

  useEffect(() => {
    localStorage.setItem("site_lang", lang);
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "he" : "ar"));

  const t = (ar: string | undefined | null, he: string | undefined | null) => {
    if (lang === "he" && he) return he;
    return ar || "";
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Search, Menu, X, Globe } from "lucide-react";
import { useCartStore } from "@/lib/web-cart-store";
import { useWebCategories } from "@/hooks/useWebProducts";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSiteSection } from "@/hooks/useSiteContent";
import logo from "@/assets/logo.webp";

export function WebHeader() {
  const totalItems = useCartStore((s) => s.totalItems());
  const { data: categories } = useWebCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { lang, toggleLang, t } = useLanguage();
  const { data: settingsData } = useSiteSection("settings", "general");
  const settings = (settingsData?.content || {}) as any;
  const storeName = t(settings.store_name || "الوجهة", settings.store_name_he || "");

  const navLinks = [
    { label: t("الرئيسية", "ראשי"), to: "/web" },
    { label: t("المتجر", "חנות"), to: "/web/shop" },
    { label: t("من نحن", "אודותינו"), to: "/web/about" },
    { label: t("تواصل معنا", "צור קשר"), to: "/web/contact" },
  ];

  return (
    <header className="bg-desert text-sand sticky top-0 z-50 shadow-lg" dir="rtl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-24">
          {/* Logo */}
          <Link to="/web" className="flex items-center gap-2 md:gap-3 group">
            <img src={logo} alt="الوجهة" className="w-14 h-14 md:w-24 md:h-24 rounded-full shadow-md ring-2 ring-gold/30 group-hover:ring-gold/60 transition-all" />
            <span className="text-lg md:text-2xl font-bold web-text-gradient-gold">{storeName}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:text-gold hover:bg-desert-light ${
                  location.pathname === link.to ? "text-gold bg-desert-light font-medium" : "text-sand/80"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="p-2.5 rounded-lg hover:text-gold hover:bg-desert-light transition-all flex items-center gap-1 text-xs font-bold"
              title={lang === "ar" ? "עברית" : "العربية"}
            >
              <Globe className="h-4 w-4" />
              <span>{lang === "ar" ? "HE" : "AR"}</span>
            </button>
            <Link to="/web/search" className="p-2.5 rounded-lg hover:text-gold hover:bg-desert-light transition-all">
              <Search className="h-5 w-5" />
            </Link>
            <Link to="/web/cart" className="p-2.5 rounded-lg hover:text-gold hover:bg-desert-light transition-all relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-gold text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md">
                  {totalItems}
                </span>
              )}
            </Link>
            <button className="md:hidden p-2.5 rounded-lg hover:bg-desert-light transition-all" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <nav className="md:hidden pb-4 border-t border-desert-light animate-fade-in">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-2.5 text-sm rounded-lg transition-all hover:bg-desert-light ${
                    location.pathname === link.to ? "text-gold bg-desert-light font-medium" : "text-sand/80"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Search, Menu, X } from "lucide-react";
import { useCartStore } from "@/lib/web-cart-store";
import { useWebCategories } from "@/hooks/useWebProducts";
import { useState } from "react";
import logo from "@/assets/logo.webp";

export function WebHeader() {
  const totalItems = useCartStore((s) => s.totalItems());
  const { data: categories } = useWebCategories();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "الرئيسية", to: "/web" },
    { label: "المتجر", to: "/web/shop" },
    { label: "من نحن", to: "/web/about" },
    { label: "تواصل معنا", to: "/web/contact" },
    { label: "الأسئلة الشائعة", to: "/web/faq" },
    { label: "تتبع الطلب", to: "/web/track" },
  ];

  return (
    <header className="bg-[hsl(30,15%,8%)] text-[hsl(36,30%,90%)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/web" className="flex items-center gap-2">
            <img src={logo} alt="الوجهة" className="w-10 h-10 rounded-full" />
            <span className="text-lg font-bold text-[hsl(36,56%,51%)]">الوجهة</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6" dir="rtl">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors hover:text-[hsl(36,56%,51%)] ${
                  location.pathname === link.to ? "text-[hsl(36,56%,51%)] font-medium" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/web/search" className="p-2 hover:text-[hsl(36,56%,51%)] transition-colors">
              <Search className="h-5 w-5" />
            </Link>
            <Link to="/web/cart" className="p-2 hover:text-[hsl(36,56%,51%)] transition-colors relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[hsl(36,56%,51%)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <nav className="md:hidden pb-4 border-t border-[hsl(30,10%,20%)]" dir="rtl">
            <div className="flex flex-col gap-2 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors hover:bg-[hsl(30,15%,18%)] ${
                    location.pathname === link.to ? "text-[hsl(36,56%,51%)] bg-[hsl(30,15%,18%)]" : ""
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

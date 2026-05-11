import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, User, Grid3X3 } from "lucide-react";
import { useCartStore } from "@/lib/web-cart-store";
import { useLanguage } from "@/hooks/useLanguage";

export function WebBottomNav() {
  const location = useLocation();
  const totalItems = useCartStore((s) => s.totalItems());
  const { t, localizedPath } = useLanguage();

  const navItems = [
    { icon: Home, label: t("الرئيسية", "ראשי"), to: localizedPath("/") },
    { icon: Grid3X3, label: t("المتجر", "חנות"), to: localizedPath("/shop") },
    { icon: Search, label: t("بحث", "חיפוש"), to: localizedPath("/search") },
    { icon: ShoppingCart, label: t("السلة", "סל"), to: localizedPath("/cart"), showBadge: true },
    { icon: User, label: t("تواصل", "צור קשר"), to: localizedPath("/contact") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-desert border-t border-desert-light safe-area-bottom" dir="rtl">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ icon: Icon, label, to, showBadge }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-gold" : "text-sand/60"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showBadge && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gold text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

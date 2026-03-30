import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, User, Grid3X3 } from "lucide-react";
import { useCartStore } from "@/lib/web-cart-store";

const navItems = [
  { icon: Home, label: "الرئيسية", to: "/web" },
  { icon: Grid3X3, label: "المتجر", to: "/web/shop" },
  { icon: Search, label: "بحث", to: "/web/search" },
  { icon: ShoppingCart, label: "السلة", to: "/web/cart", showBadge: true },
  { icon: User, label: "تواصل", to: "/web/contact" },
];

export function WebBottomNav() {
  const location = useLocation();
  const totalItems = useCartStore((s) => s.totalItems());

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

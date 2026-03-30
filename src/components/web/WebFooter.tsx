import { Link } from "react-router-dom";
import { useWebCategories } from "@/hooks/useWebProducts";
import { Phone, Mail, Facebook, Instagram } from "lucide-react";
import logo from "@/assets/logo.webp";

export function WebFooter() {
  const { data: categories } = useWebCategories();

  return (
    <footer className="bg-desert text-sand border-t border-desert-light" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="flex flex-col items-start gap-4">
            <Link to="/web" className="flex items-center gap-3">
              <img src={logo} alt="الوجهة" className="w-11 h-11 rounded-full ring-2 ring-gold/30" />
              <span className="text-xl font-bold web-text-gradient-gold">الوجهة</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              وجهتك الأولى لعالم الطبيعة والمغامرات — منتجات أصلية بأفضل الأسعار
            </p>
            <div className="flex gap-3 mt-1">
              <a href="https://www.facebook.com/1094362587370591" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-gold/20 transition-colors">
                <Facebook className="w-4 h-4 text-gold" />
              </a>
              <a href="https://www.instagram.com/elwejha.outdoors" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-gold/20 transition-colors">
                <Instagram className="w-4 h-4 text-gold" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">روابط سريعة</h3>
            <div className="flex flex-col gap-2.5">
              <Link to="/web" className="text-sm text-sand/70 hover:text-gold transition-colors">الرئيسية</Link>
              <Link to="/web/shop" className="text-sm text-sand/70 hover:text-gold transition-colors">المتجر</Link>
              <Link to="/web/about" className="text-sm text-sand/70 hover:text-gold transition-colors">من نحن</Link>
              <Link to="/web/contact" className="text-sm text-sand/70 hover:text-gold transition-colors">تواصل معنا</Link>
            </div>
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div>
              <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">الأقسام</h3>
              <div className="flex flex-col gap-2.5">
                {categories.slice(0, 6).map((cat) => (
                  <Link key={cat.id} to={`/web/category/${(cat as any).category_number || cat.id}`} className="text-sm text-sand/70 hover:text-gold transition-colors">
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <div className="flex flex-col gap-3 text-sm text-sand/70">
              <a href="tel:0526213999" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Phone className="w-4 h-4 text-gold" />
                0526213999
              </a>
              <a href="mailto:info@elwejha.co.il" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Mail className="w-4 h-4 text-gold" />
                info@elwejha.co.il
              </a>
              <a href="https://wa.me/972526573185" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gold transition-colors">
                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.12 1.52 5.856L.057 23.988l6.272-1.418A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.837-.53-5.452-1.459l-.39-.232-3.726.842.892-3.635-.254-.403A9.724 9.724 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
                واتساب
              </a>
              <p className="text-sand/50 text-xs mt-1">زيمر — نعمل أونلاين، زيارة المخازن بموعد مسبق</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-desert-light text-center text-sm text-sand/50">
          © {new Date().getFullYear()} الوجهة. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { useWebCategories } from "@/hooks/useWebProducts";
import logo from "@/assets/logo.webp";

export function WebFooter() {
  const { data: categories } = useWebCategories();

  return (
    <footer className="bg-desert text-sand border-t border-desert-light" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="flex flex-col items-start gap-4">
            <Link to="/web" className="flex items-center gap-3">
              <img src={logo} alt="الوجهة" className="w-11 h-11 rounded-full ring-2 ring-gold/30" />
              <span className="text-xl font-bold web-text-gradient-gold">الوجهة</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              منتجات أصلية بأفضل الأسعار — توصيل لجميع المناطق
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">روابط سريعة</h3>
            <div className="flex flex-col gap-2.5">
              <Link to="/web" className="text-sm text-sand/70 hover:text-gold transition-colors">الرئيسية</Link>
              <Link to="/web/shop" className="text-sm text-sand/70 hover:text-gold transition-colors">المتجر</Link>
              <Link to="/web/about" className="text-sm text-sand/70 hover:text-gold transition-colors">من نحن</Link>
              <Link to="/web/contact" className="text-sm text-sand/70 hover:text-gold transition-colors">تواصل معنا</Link>
              <Link to="/web/track" className="text-sm text-sand/70 hover:text-gold transition-colors">تتبع الطلب</Link>
            </div>
          </div>

          {/* Categories */}
          {categories && categories.length > 0 && (
            <div>
              <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">الأقسام</h3>
              <div className="flex flex-col gap-2.5">
                {categories.slice(0, 6).map((cat) => (
                  <Link key={cat.id} to={`/web/category/${cat.id}`} className="text-sm text-sand/70 hover:text-gold transition-colors">
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <h3 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <div className="flex flex-col gap-2.5 text-sm text-sand/70">
              <p>الوجهة — متجر إلكتروني</p>
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

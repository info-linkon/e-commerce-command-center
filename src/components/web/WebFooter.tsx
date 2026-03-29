import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";

export function WebFooter() {
  return (
    <footer className="bg-[hsl(30,15%,8%)] text-[hsl(36,30%,90%)] border-t border-[hsl(30,10%,20%)]" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-2">
              <img src={logo} alt="الوجهة" className="w-10 h-10 rounded-full" />
              <span className="text-lg font-bold text-[hsl(36,56%,51%)]">الوجهة</span>
            </div>
            <p className="text-sm text-[hsl(36,15%,55%)]">
              منتجات أصلية بأفضل الأسعار - توصيل لجميع المناطق
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-[hsl(36,56%,51%)] font-semibold mb-4">روابط سريعة</h3>
            <div className="flex flex-col gap-2">
              <Link to="/web" className="text-sm hover:text-[hsl(36,56%,51%)] transition-colors">الرئيسية</Link>
              <Link to="/web/shop" className="text-sm hover:text-[hsl(36,56%,51%)] transition-colors">المتجر</Link>
              <Link to="/web/about" className="text-sm hover:text-[hsl(36,56%,51%)] transition-colors">من نحن</Link>
              <Link to="/web/contact" className="text-sm hover:text-[hsl(36,56%,51%)] transition-colors">تواصل معنا</Link>
              <Link to="/web/track" className="text-sm hover:text-[hsl(36,56%,51%)] transition-colors">تتبع الطلب</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[hsl(36,56%,51%)] font-semibold mb-4">تواصل معنا</h3>
            <div className="flex flex-col gap-2 text-sm text-[hsl(36,15%,55%)]">
              <p>الوجهة - متجر إلكتروني</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[hsl(30,10%,20%)] text-center text-sm text-[hsl(36,15%,55%)]">
          © {new Date().getFullYear()} الوجهة. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}

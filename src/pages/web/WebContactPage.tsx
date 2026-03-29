import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { Phone, Mail, MapPin } from "lucide-react";

export default function WebContactPage() {
  const { data: section } = useSiteSection("contact", "info");
  const content = (section?.content as any) || defaultContent.contact.info;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-8">تواصل معنا</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {content.phone && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-gold" />
              </div>
              <a href={`tel:${content.phone}`} className="text-foreground hover:text-gold transition-colors">{content.phone}</a>
            </div>
          )}
          {content.email && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-gold" />
              </div>
              <a href={`mailto:${content.email}`} className="text-foreground hover:text-gold transition-colors">{content.email}</a>
            </div>
          )}
          {content.address && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gold" />
              </div>
              <span className="text-foreground">{content.address}</span>
            </div>
          )}
          {content.whatsapp && (
            <a
              href={`https://wa.me/${content.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-colors shadow-md"
            >
              تواصل عبر واتساب
            </a>
          )}
        </div>
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <h3 className="font-bold text-foreground mb-4">أرسل رسالة</h3>
          <form className="space-y-4">
            <input
              type="text"
              placeholder="الاسم"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-gold transition-all"
            />
            <input
              type="tel"
              placeholder="رقم الهاتف"
              dir="ltr"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-gold transition-all"
            />
            <textarea
              placeholder="الرسالة"
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-gold resize-none transition-all"
            />
            <button
              type="button"
              className="w-full py-3 web-gold-gradient text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
            >
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

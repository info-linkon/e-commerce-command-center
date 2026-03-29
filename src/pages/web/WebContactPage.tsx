import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { Phone, Mail, MapPin } from "lucide-react";

export default function WebContactPage() {
  const { data: section } = useSiteSection("contact", "info");
  const content = (section?.content as any) || defaultContent.contact.info;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">تواصل معنا</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {content.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-[hsl(36,56%,51%)]" />
              <a href={`tel:${content.phone}`} className="text-gray-700">{content.phone}</a>
            </div>
          )}
          {content.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[hsl(36,56%,51%)]" />
              <a href={`mailto:${content.email}`} className="text-gray-700">{content.email}</a>
            </div>
          )}
          {content.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[hsl(36,56%,51%)]" />
              <span className="text-gray-700">{content.address}</span>
            </div>
          )}
          {content.whatsapp && (
            <a
              href={`https://wa.me/${content.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition-colors"
            >
              تواصل عبر واتساب
            </a>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">أرسل رسالة</h3>
          <form className="space-y-4">
            <input
              type="text"
              placeholder="الاسم"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(36,56%,51%)]"
            />
            <input
              type="tel"
              placeholder="رقم الهاتف"
              dir="ltr"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(36,56%,51%)]"
            />
            <textarea
              placeholder="الرسالة"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[hsl(36,56%,51%)] resize-none"
            />
            <button
              type="button"
              className="w-full py-3 bg-[hsl(36,56%,51%)] text-white rounded-xl font-medium hover:bg-[hsl(36,56%,45%)] transition-colors"
            >
              إرسال
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useSiteSection } from "@/hooks/useSiteContent";
import { defaultContent } from "@/lib/web-default-content";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

export default function WebContactPage() {
  const { data: section } = useSiteSection("contact", "info");
  const content = (section?.content as any) || defaultContent.contact.info;
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t("تم إرسال الرسالة بنجاح! سنرد عليك قريباً.", "ההודעה נשלחה בהצלחה! נחזור אליך בקרוב."));
  };

  return (
    <div>
      <div className="bg-desert-gradient text-desert-foreground py-10 md:py-16">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-black mb-4">{t("تواصل معنا", "צור קשר")}</h1>
          <p className="text-desert-foreground/70 max-w-2xl mx-auto text-lg">
            {t("نحن هنا لمساعدتك — تواصل معنا بأي طريقة تناسبك", "אנחנו כאן לעזור — צור איתנו קשר בכל דרך שנוחה לך")}
          </p>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-6">{t("معلومات التواصل", "פרטי התקשרות")}</h2>
              <div className="space-y-4">
                {[
                  { icon: <Phone className="w-5 h-5 text-gold" />, label: t("الهاتف", "טלפון"), value: content.phone, dir: "ltr" as const },
                  { icon: <Mail className="w-5 h-5 text-gold" />, label: t("البريد الإلكتروني", "אימייל"), value: content.email },
                  { icon: <MapPin className="w-5 h-5 text-gold" />, label: t("العنوان", "כתובת"), value: content.address },
                ].filter(item => item.value).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-card rounded-xl border border-border">
                    <div className="p-2 bg-gold/10 rounded-lg">{item.icon}</div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="font-medium" dir={item.dir}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {content.whatsapp && (
              <a
                href={`https://wa.me/${content.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-green-800">{t("تواصل عبر واتساب", "צור קשר בוואטסאפ")}</p>
                  <p className="text-sm text-green-600">{t("نرد خلال دقائق", "עונים תוך דקות")}</p>
                </div>
              </a>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold mb-6">{t("أرسل لنا رسالة", "שלח לנו הודעה")}</h2>
            <div>
              <Label htmlFor="name">{t("الاسم *", "שם *")}</Label>
              <Input id="name" required className="mt-1" placeholder={t("اسمك الكامل", "השם המלא שלך") || ""} />
            </div>
            <div>
              <Label htmlFor="phone">{t("رقم الهاتف *", "מספר טלפון *")}</Label>
              <Input id="phone" type="tel" required className="mt-1" placeholder="05X-XXX-XXXX" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="message">{t("الرسالة *", "הודעה *")}</Label>
              <Textarea id="message" required className="mt-1 min-h-[120px]" placeholder={t("اكتب رسالتك هنا...", "כתוב את ההודעה שלך כאן...") || ""} />
            </div>
            <Button type="submit" className="w-full bg-gold text-gold-foreground hover:bg-gold/90 font-bold">
              {t("إرسال الرسالة", "שלח הודעה")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

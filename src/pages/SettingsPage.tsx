import { Truck, Wallet, Globe, MessageSquare, CreditCard, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ImageWebpConverter from "@/components/admin/ImageWebpConverter";
const settingsSections = [
  {
    title: "אמצעי תשלום באתר",
    description: "הפעלת/כיבוי מזומן ואשראי באתר",
    icon: Wallet,
    url: "/admin/payment-methods",
  },
  {
    title: "חברות משלוח",
    description: "ניהול שליחים פנימיים וחיצוניים",
    icon: Truck,
    url: "/settings/delivery-companies",
  },
  {
    title: "קופות",
    description: "ניהול קופות, יתרות והעברות כספים",
    icon: Wallet,
    url: "/cash-registers",
  },
  {
    title: "סנכרון WooCommerce",
    description: "ייבוא וייצוא מוצרים, קטגוריות והזמנות",
    icon: Globe,
    url: "/woo-sync",
  },
  {
    title: "תבניות SMS",
    description: "ניהול הודעות SMS אוטומטיות ללקוחות",
    icon: MessageSquare,
    url: "/admin/sms-templates",
  },
  {
    title: "הגדרות InforU SMS",
    description: "שם משתמש, טוקן ושליחת הודעת בדיקה",
    icon: MessageSquare,
    url: "/admin/inforu-settings",
  },
  {
    title: "Meta Pixel",
    description: "הגדרת Pixel ID למעקב המרות",
    icon: BarChart3,
    url: "/admin/meta-pixel",
  },
  {
    title: "הגדרות סליקה",
    description: "הגדרת חשבון HYP CreditGuard לתשלומי אשראי",
    icon: CreditCard,
    url: "/admin/hyp-settings",
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="h-6 w-6" />
        הגדרות
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsSections.map((section) => (
          <Card
            key={section.url}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => navigate(section.url)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm">פתח</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* כלי המרת תמונות */}
      <ImageWebpConverter />
    </div>
  );
};

export default SettingsPage;

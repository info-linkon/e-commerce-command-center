import { Truck, Wallet, Globe, MessageSquare, CreditCard, BarChart3, Settings as SettingsIcon, FileText, History, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ImageWebpConverter from "@/components/admin/ImageWebpConverter";
import WpImageMigrator from "@/components/admin/WpImageMigrator";
const settingsSections = [
  {
    title: "אמצעי תשלום באתר",
    description: "הפעלת/כיבוי מזומן ואשראי באתר",
    icon: Wallet,
    url: "/crm/admin/payment-methods",
  },
  {
    title: "חברות משלוח",
    description: "ניהול שליחים פנימיים וחיצוניים",
    icon: Truck,
    url: "/crm/settings/delivery-companies",
  },
  {
    title: "קופות",
    description: "ניהול קופות, יתרות והעברות כספים",
    icon: Wallet,
    url: "/crm/cash-registers",
  },
  {
    title: "סנכרון WooCommerce",
    description: "ייבוא וייצוא מוצרים, קטגוריות והזמנות",
    icon: Globe,
    url: "/crm/woo-sync",
  },
  {
    title: "תבניות SMS",
    description: "ניהול הודעות SMS אוטומטיות ללקוחות",
    icon: MessageSquare,
    url: "/crm/admin/sms-templates",
  },
  {
    title: "יומן הודעות SMS",
    description: "צפייה בכל ההודעות שנשלחו (כולל שגיאות ו-OTP)",
    icon: History,
    url: "/crm/admin/sms-log",
  },
  {
    title: "הגדרות LINKON SMS",
    description: "שם משתמש, טוקן ושליחת הודעת בדיקה",
    icon: MessageSquare,
    url: "/crm/admin/inforu-settings",
  },
  {
    title: "Meta Pixel",
    description: "הגדרת Pixel ID למעקב המרות",
    icon: BarChart3,
    url: "/crm/admin/meta-pixel",
  },
  {
    title: "הגדרות סליקה",
    description: "הגדרת חשבון HYP CreditGuard לתשלומי אשראי",
    icon: CreditCard,
    url: "/crm/admin/hyp-settings",
  },
  {
    title: "הגדרות EZCount",
    description: "API Key ומייל מפתח להפקת חשבוניות",
    icon: FileText,
    url: "/crm/admin/ezcount-settings",
  },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleClearCache = async () => {
    if (!confirm("לנקות את כל ה-cache של הדפדפן (localStorage, sessionStorage, cache, query cache) ולרענן את הדף?")) return;
    try {
      // 1. React Query cache
      qc.clear();
      // 2. localStorage + sessionStorage (keep auth session if present)
      const authKeys: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes("supabase.auth") || k.startsWith("sb-"))) {
          authKeys[k] = localStorage.getItem(k) || "";
        }
      }
      localStorage.clear();
      sessionStorage.clear();
      // restore auth so user stays logged in
      Object.entries(authKeys).forEach(([k, v]) => localStorage.setItem(k, v));
      // 3. Service worker / browser cache
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      toast.success("ה-cache נוקה — מרענן את הדף...");
      setTimeout(() => window.location.reload(), 800);
    } catch (err: any) {
      toast.error(err?.message || "שגיאה בניקוי cache");
    }
  };

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

      {/* ניקוי Cache */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-5 w-5 text-destructive" />
            ניקוי Cache
          </CardTitle>
          <CardDescription>
            מנקה את כל ה-cache של הדפדפן (נתונים שמורים, query cache, service worker) ומרענן את הדף.
            השתמש כאשר אתה רואה נתונים ישנים או לאחר עדכון גרסה. ההתחברות נשמרת.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={handleClearCache} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            נקה Cache ורענן
          </Button>
        </CardContent>
      </Card>

      {/* כלי העברת תמונות מ-WordPress */}
      <WpImageMigrator />

      {/* כלי המרת תמונות */}
      <ImageWebpConverter />
    </div>
  );
};

export default SettingsPage;

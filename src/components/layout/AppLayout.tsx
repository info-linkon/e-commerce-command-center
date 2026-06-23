import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";
import { useEffect } from "react";
import { GA_MEASUREMENT_ID } from "@/lib/gtag";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  useVersionCheck();
  // Disable GA4 collection inside the CRM so it doesn't pollute storefront analytics
  useEffect(() => {
    (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    return () => {
      (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    };
  }, []);
  const { user } = useAuth();
  const email = user?.email || "";
  const username = email.includes("@") ? email.split("@")[0] : email;
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden" dir="rtl">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b px-4 shrink-0">
            <SidebarTrigger />
            {username && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{username}</span>
              </div>
            )}
          </header>
          <div className="flex-1 p-3 sm:p-6 pb-20 md:pb-24 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;

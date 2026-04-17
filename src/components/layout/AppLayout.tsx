import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useVersionCheck } from "@/hooks/useVersionCheck";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  useVersionCheck();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 shrink-0">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-3 sm:p-6 pb-20 md:pb-6 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;

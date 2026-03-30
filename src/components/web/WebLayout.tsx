import { Outlet } from "react-router-dom";
import { WebHeader } from "./WebHeader";
import { WebFooter } from "./WebFooter";
import { MessageCircle } from "lucide-react";

export function WebLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-sand" dir="rtl">
      <WebHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <WebFooter />

      {/* WhatsApp float */}
      <a
        href="https://wa.me/972526573185"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 w-12 h-12 md:w-14 md:h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-200"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}

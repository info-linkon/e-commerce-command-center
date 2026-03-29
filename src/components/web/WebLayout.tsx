import { Outlet } from "react-router-dom";
import { WebHeader } from "./WebHeader";
import { WebFooter } from "./WebFooter";

export function WebLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <WebHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <WebFooter />
    </div>
  );
}

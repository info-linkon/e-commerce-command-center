import {
  LayoutDashboard,
  Package,
  Globe,
  ShoppingCart,
  CreditCard,
  FileText,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.webp";

const menuItems = [
  { title: "דשבורד", url: "/dashboard", icon: LayoutDashboard },
  { title: "מלאי", url: "/inventory", icon: Package },
  { title: "פריטי אתר", url: "/website-items", icon: Globe },
  { title: "הזמנות", url: "/orders", icon: ShoppingCart },
  { title: "קופה", url: "/pos", icon: CreditCard },
  { title: "מסמכים", url: "/documents", icon: FileText },
  { title: "דוחות", url: "/reports", icon: BarChart3 },
  { title: "הגדרות", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut } = useAuth();

  return (
    <Sidebar side="right" className="border-l-0 border-r">
      <div className="p-4 border-b border-sidebar-border flex flex-col items-center gap-2">
        <img src={logo} alt="Elwejha" className="w-14 h-14 rounded-full" />
        <h2 className="text-sm font-bold text-sidebar-foreground">الوجهة</h2>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="ml-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={signOut}
        >
          <LogOut className="ml-2 h-4 w-4" />
          <span>התנתק</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

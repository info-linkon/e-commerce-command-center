import {
  LayoutDashboard,
  Package,
  Globe,
  Truck,
  ShoppingCart,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Monitor,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useOrderCounts } from "@/hooks/useOrderCounts";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import logo from "@/assets/logo.webp";
import { useCallback } from "react";

const inventorySubItems = [
  { title: "תצוגת מלאי", url: "/crm/inventory" },
  { title: "פריטים", url: "/crm/inventory/products" },
  { title: "מארזים", url: "/crm/inventory/bundles" },
  { title: "קליטת מלאי", url: "/crm/inventory/intake" },
  { title: "העברות", url: "/crm/inventory/transfers" },
  { title: "פחת מלאי", url: "/crm/inventory/write-off" },
];

const ordersSubItems = [
  { title: "כל ההזמנות", url: "/crm/orders", statusKey: null },
  { title: "ממתינות", url: "/crm/orders/pending", statusKey: "pending" },
  { title: "תור ליקוט", url: "/crm/orders/picking", statusKey: "picking" },
  { title: "במשלוח", url: "/crm/orders/in-delivery", statusKey: "shipping" },
  { title: "הושלמו", url: "/crm/orders/completed", statusKey: "completed" },
];

const webManagementSubItems = [
  { title: "תוכן ודפים", url: "/crm/admin/web-content" },
  { title: "באנרים", url: "/crm/admin/web-banners" },
  { title: "קופונים", url: "/crm/admin/coupons" },
];

const menuItems = [
  { title: "פריטי אתר", url: "/crm/website-items", icon: Globe },
  { title: "לקוחות", url: "/crm/customers", icon: Users },
  { title: "משלוחים", url: "/crm/deliveries", icon: Truck },
  { title: "הוצאות", url: "/crm/finance", icon: Receipt },
  { title: "דוחות", url: "/crm/reports", icon: BarChart3 },
  { title: "הגדרות", url: "/crm/settings", icon: Settings },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: orderCounts } = useOrderCounts();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

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
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/crm/dashboard"
                    end
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    onClick={closeMobileSidebar}
                  >
                    <LayoutDashboard className="ml-2 h-4 w-4" />
                    <span>דשבורד</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* POS */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/crm/pos"
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    onClick={closeMobileSidebar}
                  >
                    <CreditCard className="ml-2 h-4 w-4" />
                    <span>קופה</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Inventory with submenu */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-sidebar-accent w-full justify-between">
                      <span className="flex items-center">
                        <Package className="ml-2 h-4 w-4" />
                        <span>מלאי</span>
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {inventorySubItems.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/crm/inventory"}
                              className="hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              onClick={closeMobileSidebar}
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Orders with submenu */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-sidebar-accent w-full justify-between">
                      <span className="flex items-center">
                        <ShoppingCart className="ml-2 h-4 w-4" />
                        <span>הזמנות</span>
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {ordersSubItems.map((item) => {
                        const count = item.statusKey && orderCounts ? orderCounts[item.statusKey] || 0 : null;
                        return (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.url === "/crm/orders"}
                                className="hover:bg-sidebar-accent flex items-center justify-between w-full"
                                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                                onClick={closeMobileSidebar}
                              >
                                <span>{item.title}</span>
                                {count !== null && count > 0 && (
                                  <span className="mr-auto ml-2 text-[10px] leading-none bg-primary/15 text-primary font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                    {count}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Web Management submenu */}
              <Collapsible className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="hover:bg-sidebar-accent w-full justify-between">
                      <span className="flex items-center">
                        <Monitor className="ml-2 h-4 w-4" />
                        <span>ניהול אתר</span>
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {webManagementSubItems.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={item.url}
                              className="hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                              onClick={closeMobileSidebar}
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-sidebar-accent flex items-center"
                          >
                            <Globe className="ml-2 h-3 w-3" />
                            <span>צפה באתר</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Rest of menu items */}
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={closeMobileSidebar}
                    >
                      <item.icon className="ml-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Admin-only: Users management */}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/crm/admin/users"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      onClick={closeMobileSidebar}
                    >
                      <Users className="ml-2 h-4 w-4" />
                      <span>משתמשים</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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

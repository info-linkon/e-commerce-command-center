import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import InventoryIndex from "./pages/inventory/InventoryIndex";
import ProductsPage from "./pages/inventory/ProductsPage";
import ProductForm from "./pages/inventory/ProductForm";
import BundlesPage from "./pages/inventory/BundlesPage";
import BundleForm from "./pages/inventory/BundleForm";
import IntakePage from "./pages/inventory/IntakePage";
import TransfersPage from "./pages/inventory/TransfersPage";
import InventoryWriteOffPage from "./pages/inventory/InventoryWriteOffPage";
import OrdersPage from "./pages/orders/OrdersPage";
import OrderForm from "./pages/orders/OrderForm";
import OrderDetail from "./pages/orders/OrderDetail";
import PickingQueuePage from "./pages/orders/PickingQueuePage";
import InDeliveryPage from "./pages/orders/InDeliveryPage";
import PosPage from "./pages/PosPage";
import WooSyncPage from "./pages/WooSyncPage";
import ReportsPage from "./pages/ReportsPage";
import FinancePage from "./pages/FinancePage";
import DeliveriesPage from "./pages/deliveries/DeliveriesPage";
import DeliveryCompaniesPage from "./pages/settings/DeliveryCompaniesPage";
import CashRegistersPage from "./pages/CashRegistersPage";
import CustomersPage from "./pages/customers/CustomersPage";
import NotFound from "./pages/NotFound";
import FlowsPage from "./pages/FlowsPage";
import WebsiteItemsPage from "./pages/WebsiteItemsPage";
import SettingsPage from "./pages/SettingsPage";

// Public website
import { WebLayout } from "@/components/web/WebLayout";
import WebHome from "./pages/web/WebHome";
import WebShopPage from "./pages/web/WebShopPage";
import WebCategoryPage from "./pages/web/WebCategoryPage";
import WebProductPage from "./pages/web/WebProductPage";
import WebCartPage from "./pages/web/WebCartPage";
import WebCheckoutPage from "./pages/web/WebCheckoutPage";
import WebOrderConfirmation from "./pages/web/WebOrderConfirmation";
import WebSearchPage from "./pages/web/WebSearchPage";
import WebAboutPage from "./pages/web/WebAboutPage";
import WebContactPage from "./pages/web/WebContactPage";
import WebFAQPage from "./pages/web/WebFAQPage";
import WebTrackOrderPage from "./pages/web/WebTrackOrderPage";

// Admin website management
import WebContentPage from "./pages/admin/WebContentPage";
import WebBannersPage from "./pages/admin/WebBannersPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            {/* Public Website */}
            <Route path="/web" element={<WebLayout />}>
              <Route index element={<WebHome />} />
              <Route path="shop" element={<WebShopPage />} />
              <Route path="category/:id" element={<WebCategoryPage />} />
              <Route path="product/:id" element={<WebProductPage />} />
              <Route path="cart" element={<WebCartPage />} />
              <Route path="checkout" element={<WebCheckoutPage />} />
              <Route path="order-confirmation/:orderNumber" element={<WebOrderConfirmation />} />
              <Route path="search" element={<WebSearchPage />} />
              <Route path="about" element={<WebAboutPage />} />
              <Route path="contact" element={<WebContactPage />} />
            </Route>

            {/* Admin Panel */}
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/flows" element={<Protected><FlowsPage /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/inventory" element={<Protected><InventoryIndex /></Protected>} />
            <Route path="/inventory/products" element={<Protected><ProductsPage /></Protected>} />
            <Route path="/inventory/products/new" element={<Protected><ProductForm /></Protected>} />
            <Route path="/inventory/products/:id" element={<Protected><ProductForm /></Protected>} />
            <Route path="/inventory/bundles" element={<Protected><BundlesPage /></Protected>} />
            <Route path="/inventory/bundles/new" element={<Protected><BundleForm /></Protected>} />
            <Route path="/inventory/bundles/:id" element={<Protected><BundleForm /></Protected>} />
            <Route path="/inventory/intake" element={<Protected><IntakePage /></Protected>} />
            <Route path="/inventory/transfers" element={<Protected><TransfersPage /></Protected>} />
            <Route path="/inventory/write-off" element={<Protected><InventoryWriteOffPage /></Protected>} />
            <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
            <Route path="/orders/new" element={<Protected><OrderForm /></Protected>} />
            <Route path="/orders/picking" element={<Protected><PickingQueuePage /></Protected>} />
            <Route path="/orders/in-delivery" element={<Protected><InDeliveryPage /></Protected>} />
            <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
            <Route path="/pos" element={<Protected><PosPage /></Protected>} />
            <Route path="/deliveries" element={<Protected><DeliveriesPage /></Protected>} />
            <Route path="/settings/delivery-companies" element={<Protected><DeliveryCompaniesPage /></Protected>} />
            <Route path="/cash-registers" element={<Protected><CashRegistersPage /></Protected>} />
            <Route path="/finance" element={<Protected><FinancePage /></Protected>} />
            <Route path="/customers" element={<Protected><CustomersPage /></Protected>} />
            <Route path="/woo-sync" element={<Protected><WooSyncPage /></Protected>} />
            <Route path="/website-items" element={<Protected><WebsiteItemsPage /></Protected>} />
            <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
            <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />

            {/* Admin website management */}
            <Route path="/admin/web-content" element={<Protected><WebContentPage /></Protected>} />
            <Route path="/admin/web-banners" element={<Protected><WebBannersPage /></Protected>} />
            <Route path="/admin/coupons" element={<Protected><AdminCouponsPage /></Protected>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

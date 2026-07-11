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
import ProductPerformancePage from "./pages/inventory/ProductPerformancePage";
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
import WebOrderSummary from "./pages/web/WebOrderSummary";
import WebSearchPage from "./pages/web/WebSearchPage";
import WebAboutPage from "./pages/web/WebAboutPage";
import WebContactPage from "./pages/web/WebContactPage";
import InvoiceRedirect from "./pages/web/InvoiceRedirect";
import PaymentRedirect from "./pages/web/PaymentRedirect";

// Admin website management
import WebContentPage from "./pages/admin/WebContentPage";
import WebBannersPage from "./pages/admin/WebBannersPage";
import ExclusiveDealsPage from "./pages/admin/ExclusiveDealsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import SmsTemplatesPage from "./pages/admin/SmsTemplatesPage";
import MetaPixelSettingsPage from "./pages/admin/MetaPixelSettingsPage";
import TikTokPixelSettingsPage from "./pages/admin/TikTokPixelSettingsPage";
import HypSettingsPage from "./pages/admin/HypSettingsPage";
import PaymentMethodsSettingsPage from "./pages/admin/PaymentMethodsSettingsPage";
import InforuSettingsPage from "./pages/admin/InforuSettingsPage";
import EzcountSettingsPage from "./pages/admin/EzcountSettingsPage";
import UsersPage from "./pages/admin/UsersPage";
import SmsLogPage from "./pages/admin/SmsLogPage";

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
            {/* Public Website — root (Arabic) */}
            <Route path="/" element={<WebLayout />}>
              <Route index element={<WebHome />} />
              <Route path="shop" element={<WebShopPage />} />
              <Route path="category/:id" element={<WebCategoryPage />} />
              <Route path="product/:id" element={<WebProductPage />} />
              <Route path="cart" element={<WebCartPage />} />
              <Route path="checkout" element={<WebCheckoutPage />} />
              <Route path="order-confirmation/:orderNumber?" element={<WebOrderConfirmation />} />
              <Route path="order/:orderNumber" element={<WebOrderSummary />} />
              <Route path="search" element={<WebSearchPage />} />
              <Route path="about" element={<WebAboutPage />} />
              <Route path="contact" element={<WebContactPage />} />
            </Route>

            {/* Public Website — Hebrew prefix */}
            <Route path="/he" element={<WebLayout />}>
              <Route index element={<WebHome />} />
              <Route path="shop" element={<WebShopPage />} />
              <Route path="category/:id" element={<WebCategoryPage />} />
              <Route path="product/:id" element={<WebProductPage />} />
              <Route path="cart" element={<WebCartPage />} />
              <Route path="checkout" element={<WebCheckoutPage />} />
              <Route path="order-confirmation/:orderNumber?" element={<WebOrderConfirmation />} />
              <Route path="order/:orderNumber" element={<WebOrderSummary />} />
              <Route path="search" element={<WebSearchPage />} />
              <Route path="about" element={<WebAboutPage />} />
              <Route path="contact" element={<WebContactPage />} />
            </Route>

            {/* Public invoice short link */}
            <Route path="/inv/:code" element={<InvoiceRedirect />} />
            <Route path="/pay/:orderNumber" element={<PaymentRedirect />} />

            {/* CRM Auth */}
            <Route path="/crm/auth" element={<Auth />} />

            {/* CRM Admin Panel */}
            <Route path="/crm" element={<Protected><Dashboard /></Protected>} />
            <Route path="/crm/flows" element={<Protected><FlowsPage /></Protected>} />
            <Route path="/crm/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/crm/inventory" element={<Protected><InventoryIndex /></Protected>} />
            <Route path="/crm/inventory/products" element={<Protected><ProductsPage /></Protected>} />
            <Route path="/crm/inventory/products/new" element={<Protected><ProductForm /></Protected>} />
            <Route path="/crm/inventory/products/:id" element={<Protected><ProductForm /></Protected>} />
            <Route path="/crm/inventory/products/:id/performance" element={<Protected><ProductPerformancePage /></Protected>} />
            <Route path="/crm/inventory/bundles" element={<Protected><BundlesPage /></Protected>} />
            <Route path="/crm/inventory/bundles/new" element={<Protected><BundleForm /></Protected>} />
            <Route path="/crm/inventory/bundles/:id" element={<Protected><BundleForm /></Protected>} />
            <Route path="/crm/inventory/intake" element={<Protected><IntakePage /></Protected>} />
            <Route path="/crm/inventory/transfers" element={<Protected><TransfersPage /></Protected>} />
            <Route path="/crm/inventory/write-off" element={<Protected><InventoryWriteOffPage /></Protected>} />
            <Route path="/crm/orders" element={<Protected><OrdersPage /></Protected>} />
            <Route path="/crm/orders/new" element={<Protected><OrderForm /></Protected>} />
            <Route path="/crm/orders/pending" element={<Protected><OrdersPage defaultStatus="pending" /></Protected>} />
            <Route path="/crm/orders/picking" element={<Protected><PickingQueuePage /></Protected>} />
            <Route path="/crm/orders/in-delivery" element={<Protected><InDeliveryPage /></Protected>} />
            <Route path="/crm/orders/completed" element={<Protected><OrdersPage defaultStatus="completed" /></Protected>} />
            <Route path="/crm/orders/:id" element={<Protected><OrderDetail /></Protected>} />
            <Route path="/crm/pos" element={<Protected><PosPage /></Protected>} />
            <Route path="/crm/deliveries" element={<Protected><DeliveriesPage /></Protected>} />
            <Route path="/crm/settings/delivery-companies" element={<Protected><DeliveryCompaniesPage /></Protected>} />
            <Route path="/crm/cash-registers" element={<Protected><CashRegistersPage /></Protected>} />
            <Route path="/crm/finance" element={<Protected><FinancePage /></Protected>} />
            <Route path="/crm/customers" element={<Protected><CustomersPage /></Protected>} />
            <Route path="/crm/woo-sync" element={<Protected><WooSyncPage /></Protected>} />
            <Route path="/crm/website-items" element={<Protected><WebsiteItemsPage /></Protected>} />
            <Route path="/crm/settings" element={<Protected><SettingsPage /></Protected>} />
            <Route path="/crm/reports" element={<Protected><ReportsPage /></Protected>} />

            {/* CRM Admin website management */}
            <Route path="/crm/admin/web-content" element={<Protected><WebContentPage /></Protected>} />
            <Route path="/crm/admin/web-banners" element={<Protected><WebBannersPage /></Protected>} />
            <Route path="/crm/admin/exclusive-deals" element={<Protected><ExclusiveDealsPage /></Protected>} />
            <Route path="/crm/admin/coupons" element={<Protected><AdminCouponsPage /></Protected>} />
            <Route path="/crm/admin/sms-templates" element={<Protected><SmsTemplatesPage /></Protected>} />
            <Route path="/crm/admin/sms-log" element={<Protected><SmsLogPage /></Protected>} />
            <Route path="/crm/admin/meta-pixel" element={<Protected><MetaPixelSettingsPage /></Protected>} />
            <Route path="/crm/admin/tiktok-pixel" element={<Protected><TikTokPixelSettingsPage /></Protected>} />
            <Route path="/crm/admin/hyp-settings" element={<Protected><HypSettingsPage /></Protected>} />
            <Route path="/crm/admin/payment-methods" element={<Protected><PaymentMethodsSettingsPage /></Protected>} />
            <Route path="/crm/admin/inforu-settings" element={<Protected><InforuSettingsPage /></Protected>} />
            <Route path="/crm/admin/ezcount-settings" element={<Protected><EzcountSettingsPage /></Protected>} />
            <Route path="/crm/admin/users" element={<Protected><UsersPage /></Protected>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

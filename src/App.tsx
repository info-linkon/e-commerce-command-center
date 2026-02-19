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
import WarehousesPage from "./pages/inventory/WarehousesPage";
import CategoriesPage from "./pages/inventory/CategoriesPage";
import BundlesPage from "./pages/inventory/BundlesPage";
import BundleForm from "./pages/inventory/BundleForm";
import OrdersPage from "./pages/orders/OrdersPage";
import OrderForm from "./pages/orders/OrderForm";
import OrderDetail from "./pages/orders/OrderDetail";
import PosPage from "./pages/PosPage";
import WooSyncPage from "./pages/WooSyncPage";
import ReportsPage from "./pages/ReportsPage";
import DocumentsPage from "./pages/DocumentsPage";
import NotFound from "./pages/NotFound";
import FlowsPage from "./pages/FlowsPage";

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
            <Route path="/flows" element={<FlowsPage />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/inventory" element={<Protected><InventoryIndex /></Protected>} />
            <Route path="/inventory/products" element={<Protected><ProductsPage /></Protected>} />
            <Route path="/inventory/products/new" element={<Protected><ProductForm /></Protected>} />
            <Route path="/inventory/products/:id" element={<Protected><ProductForm /></Protected>} />
            <Route path="/inventory/warehouses" element={<Protected><WarehousesPage /></Protected>} />
            <Route path="/inventory/categories" element={<Protected><CategoriesPage /></Protected>} />
            <Route path="/inventory/bundles" element={<Protected><BundlesPage /></Protected>} />
            <Route path="/inventory/bundles/new" element={<Protected><BundleForm /></Protected>} />
            <Route path="/inventory/bundles/:id" element={<Protected><BundleForm /></Protected>} />
            <Route path="/orders" element={<Protected><OrdersPage /></Protected>} />
            <Route path="/orders/new" element={<Protected><OrderForm /></Protected>} />
            <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
            <Route path="/pos" element={<Protected><PosPage /></Protected>} />
            <Route path="/woo-sync" element={<Protected><WooSyncPage /></Protected>} />
            <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
            <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

// Eagerly load critical components
import Index from "./pages/Index";
import Login from "./pages/Login";

// Lazy load non-critical routes
const Registration = lazy(() => import("./pages/Registration"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const StoreDashboard = lazy(() => import("./pages/StoreDashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers").then(m => ({ default: m.Customers })));
const Products = lazy(() => import("./pages/Products").then(m => ({ default: m.Products })));
const Categories = lazy(() => import("./pages/Categories").then(m => ({ default: m.Categories })));
const Extras = lazy(() => import("./pages/Extras").then(m => ({ default: m.Extras })));
const DeliveryFees = lazy(() => import("./pages/DeliveryFees").then(m => ({ default: m.DeliveryFees })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const MenuManagement = lazy(() => import("./pages/MenuManagement"));

const queryClient = new QueryClient();

// Loading fallback component for page content only
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Full screen loading for initial load
const FullLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Layout wrapper that keeps the DashboardLayout mounted
const DashboardLayoutWrapper = () => (
  <DashboardLayout>
    <Suspense fallback={<PageLoadingFallback />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="anafood-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <Registration />
              </Suspense>
            } />
            
            {/* Dashboard routes with persistent layout */}
            <Route element={<DashboardLayoutWrapper />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/dashboard" element={<StoreDashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/extras" element={<Extras />} />
              <Route path="/delivery-fees" element={<DeliveryFees />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/menu-management" element={<MenuManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/company-profile" element={<CompanyProfile />} />
            </Route>

            <Route path="/auth/callback" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <AuthCallback />
              </Suspense>
            } />
            <Route path="*" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <NotFound />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

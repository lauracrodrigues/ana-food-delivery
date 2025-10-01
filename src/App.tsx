import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
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
              <Suspense fallback={<LoadingFallback />}>
                <Registration />
              </Suspense>
            } />
            <Route path="/admin" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><AdminDashboard /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/dashboard" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><StoreDashboard /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/orders" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Orders /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/customers" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Customers /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/products" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Products /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/categories" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Categories /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/extras" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Extras /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/delivery-fees" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><DeliveryFees /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/payment-methods" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><PaymentMethods /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/whatsapp" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><WhatsApp /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/settings" element={
              <Suspense fallback={<LoadingFallback />}>
                <DashboardLayout><Settings /></DashboardLayout>
              </Suspense>
            } />
            <Route path="/auth/callback" element={
              <Suspense fallback={<LoadingFallback />}>
                <AuthCallback />
              </Suspense>
            } />
            <Route path="*" element={
              <Suspense fallback={<LoadingFallback />}>
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

import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { CacheProvider } from "@/contexts/CacheContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eagerly load critical components
import Index from "./pages/Index";
import Menu from "./pages/Menu";

const Login = lazy(() => import("./pages/Login"));

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
const PublicMenu = lazy(() => import("./pages/PublicMenu"));
const Users = lazy(() => import("./pages/Users"));
const POS = lazy(() => import("./pages/POS"));
const Tables = lazy(() => import("./pages/Tables"));
const CashRegister = lazy(() => import("./pages/CashRegister"));
const CashRegisterHistory = lazy(() => import("./pages/CashRegisterHistory"));
const WhatsAppChat = lazy(() => import("./pages/WhatsAppChat"));
const Billing = lazy(() => import("./pages/Billing"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const KanbanPreviewA = lazy(() => import("./pages/KanbanPreviewA"));
const KanbanPreviewB = lazy(() => import("./pages/KanbanPreviewB"));
const KanbanPreviewC = lazy(() => import("./pages/KanbanPreviewC"));

// v1.0.0 — Detecta subdomain pra renderizar PublicMenu direto na raiz
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  // Skip localhost / IP
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split(".");
  // anafood.vip = 2 parts, pizzaria.anafood.vip = 3 parts
  if (parts.length < 3) return null;
  const sub = parts[0];
  // Skip www e subdomains de sistema
  if (["www", "api", "evo", "admin"].includes(sub)) return null;
  return sub;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
});

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

// Layout fullScreen para Kanban (sem padding, h-screen, overflow-hidden)
const KanbanLayoutWrapper = () => (
  <DashboardLayout fullScreen>
    <Suspense fallback={<PageLoadingFallback />}>
      <Outlet />
    </Suspense>
  </DashboardLayout>
);

const App = () => {
  const subdomain = getSubdomain();
  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="anafood-theme">
      <CacheProvider defaultTTL={3600} enableLogs={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            {/* Subdomain ativo: rota raiz renderiza menu público direto */}
            <Route path="/" element={
              subdomain ? (
                <Suspense fallback={<FullLoadingFallback />}>
                  <PublicMenu subdomainOverride={subdomain} />
                </Suspense>
              ) : <Index />
            } />
            <Route path="/login" element={<Suspense fallback={<FullLoadingFallback />}><Login /></Suspense>} />
            <Route path="/cadastro" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <Registration />
              </Suspense>
            } />
            
            {/* Admin SaaS — sem sidebar do cliente */}
            <Route path="/admin" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            } />

            {/* Kanban fullScreen — sem padding, sem rodapé */}
            <Route element={<KanbanLayoutWrapper />}>
              <Route path="/orders" element={<Orders />} />
            </Route>

            {/* Dashboard routes with persistent layout */}
            <Route element={<DashboardLayoutWrapper />}>
              <Route path="/dashboard" element={<StoreDashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/extras" element={<Extras />} />
              <Route path="/delivery-fees" element={<DeliveryFees />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/menu-management" element={<MenuManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/company-profile" element={<CompanyProfile />} />
              <Route path="/pdv" element={<POS />} />
              <Route path="/mesas" element={<Tables />} />
              <Route path="/caixa" element={<CashRegister />} />
              <Route path="/caixa/historico" element={<CashRegisterHistory />} />
              <Route path="/whatsapp-chat" element={<WhatsAppChat />} />
              <Route path="/billing" element={<Billing />} />
              
              {/* Protected admin-only routes */}
              <Route path="/users" element={
                <ProtectedRoute requiredRole={["company_admin"]} fallbackPath="/">
                  <Users />
                </ProtectedRoute>
              } />
            </Route>

            {/* Previews de layout Kanban — sem auth, acesso direto */}
            <Route path="/kanban-preview/a" element={<Suspense fallback={<FullLoadingFallback />}><KanbanPreviewA /></Suspense>} />
            <Route path="/kanban-preview/b" element={<Suspense fallback={<FullLoadingFallback />}><KanbanPreviewB /></Suspense>} />
            <Route path="/kanban-preview/c" element={<Suspense fallback={<FullLoadingFallback />}><KanbanPreviewC /></Suspense>} />

            <Route path="/termos" element={<Suspense fallback={<FullLoadingFallback />}><Terms /></Suspense>} />
            <Route path="/privacidade" element={<Suspense fallback={<FullLoadingFallback />}><Privacy /></Suspense>} />
            <Route path="/checkout/success" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <CheckoutSuccess />
              </Suspense>
            } />
            <Route path="/auth/callback" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <AuthCallback />
              </Suspense>
            } />
            <Route path="/menu/:subdomain" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <PublicMenu />
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
      </CacheProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;

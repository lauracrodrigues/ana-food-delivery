import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { CacheProvider } from "@/contexts/CacheContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute, AdminRoute, ClientRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { GlobalLoader, PageLoader } from "@/components/loading";

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
const Estoque = lazy(() => import("./pages/Estoque"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Distribuidoras = lazy(() => import("./pages/Distribuidoras"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const MenuPrint = lazy(() => import("./pages/MenuPrint"));
const Deliverers = lazy(() => import("./pages/Deliverers").then(m => ({ default: m.Deliverers })));
const DelivererDashboard = lazy(() => import("./pages/DelivererDashboard"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const KanbanPreviewA = lazy(() => import("./pages/KanbanPreviewA"));
const KanbanPreviewB = lazy(() => import("./pages/KanbanPreviewB"));
const KanbanPreviewC = lazy(() => import("./pages/KanbanPreviewC"));

// v1.1.0 — Detecta subdomain pra renderizar PublicMenu direto na raiz
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  // Skip localhost / IP
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  // Skip URLs de preview/admin do Cloudflare (workers.dev, pages.dev)
  if (host.endsWith(".workers.dev") || host.endsWith(".pages.dev")) return null;
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

// Skeleton-based loader para lazy routes dentro do layout
const PageLoadingFallback = () => <PageLoader />;

// Splash screen fullscreen para carregamento inicial
const FullLoadingFallback = () => <SplashScreen />;

// Layout wrapper que exige role de cliente (company_admin / company_staff)
const DashboardLayoutWrapper = () => (
  <ClientRoute>
    <DashboardLayout>
      <RouteErrorBoundary routeName="Dashboard">
        <Suspense fallback={<PageLoadingFallback />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </DashboardLayout>
  </ClientRoute>
);

// Layout fullScreen para Kanban — também protegido por ClientRoute
const KanbanLayoutWrapper = () => (
  <ClientRoute>
    <DashboardLayout fullScreen>
      <RouteErrorBoundary routeName="Kanban de Pedidos">
        <Suspense fallback={<PageLoadingFallback />}>
          <Outlet />
        </Suspense>
      </RouteErrorBoundary>
    </DashboardLayout>
  </ClientRoute>
);

// Redireciona erros de OTP do Supabase (hash na URL raiz) para /entregador
function HashErrorRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=access_denied') && hash.includes('otp_expired')) {
      navigate('/entregador', { replace: true, state: { authError: 'otp_expired' } });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const App = () => {
  const subdomain = getSubdomain();
  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <CacheProvider defaultTTL={3600} enableLogs={false}>
        <TooltipProvider>
          <GlobalLoader />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <HashErrorRedirect />
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
            
            {/* Admin SaaS — só super_admin */}
            <Route path="/admin" element={
              <AdminRoute>
                <Suspense fallback={<FullLoadingFallback />}>
                  <AdminDashboard />
                </Suspense>
              </AdminRoute>
            } />

            {/* Módulo do entregador — tela isolada, mobile-first, sem sidebar */}
            <Route path="/entregador" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <DelivererDashboard />
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
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/extras" element={<Extras />} />
              <Route path="/delivery-fees" element={<DeliveryFees />} />
              <Route path="/entregadores" element={<Deliverers />} />
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
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/distribuidoras" element={<Distribuidoras />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/loyalty" element={<Loyalty />} />

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
            <Route path="/menu/:subdomain/print" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <MenuPrint />
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

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
// v1.0.1 — Produtos/Categorias unificados em /menu (Cardápio). Imports removidos.
const Extras = lazy(() => import("./pages/Extras").then(m => ({ default: m.Extras })));
const DeliveryFees = lazy(() => import("./pages/DeliveryFees").then(m => ({ default: m.DeliveryFees })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const WhatsApp = lazy(() => import("./pages/WhatsApp"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
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
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Distribuidoras = lazy(() => import("./pages/Distribuidoras"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Retention = lazy(() => import("./pages/Retention"));
const Heatmap = lazy(() => import("./pages/Heatmap"));
const Caixa = lazy(() => import("./pages/Caixa"));
const Titulos = lazy(() => import("./pages/Titulos"));
const DRE = lazy(() => import("./pages/DRE"));
const EstoqueMP = lazy(() => import("./pages/EstoqueMP"));
const ContasFin = lazy(() => import("./pages/ContasFin"));
const Movimentos = lazy(() => import("./pages/Movimentos"));
// Grupos de Opções agora dentro da ficha do produto em /menu
const Analytics = lazy(() => import("./pages/Analytics"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const MenuPrint = lazy(() => import("./pages/MenuPrint"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Combos = lazy(() => import("./pages/Combos"));
const DailyMenu = lazy(() => import("./pages/DailyMenu"));
const Deliverers = lazy(() => import("./pages/Deliverers").then(m => ({ default: m.Deliverers })));
const DelivererDashboard = lazy(() => import("./pages/DelivererDashboard"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const KanbanPreviewA = lazy(() => import("./pages/KanbanPreviewA"));
const KanbanPreviewB = lazy(() => import("./pages/KanbanPreviewB"));
const KanbanPreviewC = lazy(() => import("./pages/KanbanPreviewC"));

// v1.2.0 — Detecta subdomain OU custom domain pra renderizar PublicMenu na raiz
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.endsWith(".workers.dev") || host.endsWith(".pages.dev")) return null;
  const parts = host.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  // Subdomínios reservados (não são lojas — sistema/infra)
  const RESERVED = [
    "www", "api", "evo", "admin", "app", "mail", "blog",
    "gestao", "login", "auth", "dashboard", "panel", "support",
    "help", "docs", "status", "cdn", "static", "assets",
  ];
  if (RESERVED.includes(sub)) return null;
  if (host.endsWith(".anafood.vip")) return sub;
  return null;
}

// Detecta domínio próprio (não-anafood.vip, não-workers.dev, não-localhost)
function getCustomDomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.endsWith(".workers.dev") || host.endsWith(".pages.dev")) return null;
  if (host.endsWith(".anafood.vip") || host === "anafood.vip") return null;
  return host;
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
  const customDomain = getCustomDomain();
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
            {/* Subdomain ou domínio próprio: rota raiz renderiza menu público direto */}
            <Route path="/" element={
              (subdomain || customDomain) ? (
                <Suspense fallback={<FullLoadingFallback />}>
                  <PublicMenu subdomainOverride={subdomain ?? undefined} customDomainOverride={customDomain ?? undefined} />
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
              {/* Páginas unificadas — redirecionam pra /menu (Cardápio) */}
              <Route path="/products" element={<Navigate to="/menu" replace />} />
              <Route path="/categories" element={<Navigate to="/menu" replace />} />
              {/* /estoque registrado abaixo apontando p/ EstoqueMP (MP + lotes) — Estoque antigo descontinuado */}
              <Route path="/extras" element={<Extras />} />
              <Route path="/delivery-fees" element={<DeliveryFees />} />
              <Route path="/entregadores" element={<Deliverers />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/menu-management" element={<MenuManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/company-profile" element={<CompanyProfile />} />
              {/* /pdv mantido por retro-compat — redireciona pra Balcão */}
              <Route path="/pdv" element={<POS />} />
              <Route path="/vendas/balcao"  element={<POS initialContext="counter" />} />
              <Route path="/vendas/mesa"    element={<POS initialContext="table" />} />
              <Route path="/vendas/entrega" element={<POS initialContext="delivery" />} />
              <Route path="/mesas" element={<Tables />} />
              <Route path="/caixa" element={<CashRegister />} />
              <Route path="/caixa/historico" element={<CashRegisterHistory />} />
              <Route path="/whatsapp-chat" element={<WhatsAppChat />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/distribuidoras" element={<Distribuidoras />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/heatmap" element={<Heatmap />} />
              <Route path="/caixa" element={<Caixa />} />
              <Route path="/titulos" element={<Titulos />} />
              <Route path="/dre" element={<DRE />} />
              <Route path="/estoque" element={<EstoqueMP />} />
              <Route path="/movimentos" element={<Movimentos />} />
              <Route path="/modifier-groups" element={<Navigate to="/menu" replace />} />
              <Route path="/financeiro/contas" element={<ContasFin />} />
              <Route path="/retention" element={<Retention />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/loyalty" element={<Loyalty />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/combos" element={<Combos />} />
              <Route path="/daily-menu" element={<DailyMenu />} />

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
            <Route path="/completar-perfil" element={
              <Suspense fallback={<FullLoadingFallback />}>
                <CompleteProfile />
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

// v1.6.0 — Mobile responsivo: SidebarTrigger no header + NotificationBell ajustado
import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { initializeColorPalette, resetPalette } from "@/hooks/use-color-palette";
import { UserThemeSync } from "@/components/layout/UserThemeSync";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { useInitialLoad } from "@/hooks/useInitialLoad";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Remove padding e força h-screen — use na página de Pedidos/Kanban */
  fullScreen?: boolean;
}

// Lê cookie sidebar:state para restaurar posição ao recarregar
function getSidebarDefaultOpen(): boolean {
  if (typeof document === 'undefined') return false;
  const cookie = document.cookie.split('; ').find(c => c.startsWith('sidebar:state='));
  if (!cookie) return false;
  return cookie.split('=')[1] === 'true';
}

export function DashboardLayout({ children, fullScreen }: DashboardLayoutProps) {
  const { context, isReady } = useInitialLoad();
  // Atraso mínimo de 400ms pra animação fluida (evita flash quando carrega muito rápido)
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    initializeColorPalette();
    const t = setTimeout(() => setDelayPassed(true), 400);
    return () => {
      clearTimeout(t);
      resetPalette();
    };
  }, []);

  const showSplash = !isReady || !delayPassed;

  return (
    <SidebarProvider defaultOpen={getSidebarDefaultOpen()}>
      <UserThemeSync />
      {/* Splash full-screen até profile + company + logo preload concluídos */}
      <SplashScreen
        visible={showSplash}
        companyLogo={context?.companyLogo}
        companyName={context?.companyName}
        message="Preparando o painel..."
      />
      <div
        className={`relative flex w-full bg-background ${fullScreen ? 'h-screen overflow-hidden' : 'min-h-screen'} transition-opacity duration-300`}
        style={{ opacity: showSplash ? 0 : 1 }}
      >
        <AppSidebar />
        {/* v1.6.0 — Mobile header com hambúrguer + sino. Desktop sino canto direito flutuante */}
        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${fullScreen ? 'overflow-hidden' : 'overflow-auto'}`}>
          {/* Mobile-only header bar — hamburger + sino (não sobrepõe conteúdo) */}
          <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-background/95 backdrop-blur border-b px-3 py-2 shrink-0">
            <SidebarTrigger className="h-9 w-9" />
            <NotificationBell />
          </div>
          {/* Desktop sino fixed top-right (não bloqueia conteúdo central) */}
          <div className="hidden lg:block fixed top-3 right-4 z-40">
            <div className="bg-background/90 backdrop-blur rounded-full shadow-sm border">
              <NotificationBell />
            </div>
          </div>
          {fullScreen ? (
            children
          ) : (
            <div className="px-4 sm:px-6 lg:px-8 py-4 content-fade-in flex-1">
              {children}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
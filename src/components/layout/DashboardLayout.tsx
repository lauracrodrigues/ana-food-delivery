// v1.6.0 — Mobile responsivo: SidebarTrigger no header + NotificationBell ajustado
import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { initializeColorPalette, resetPalette } from "@/hooks/use-color-palette";
import { UserThemeSync } from "@/components/layout/UserThemeSync";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { useInitialLoad } from "@/hooks/useInitialLoad";
import { Button } from "@/components/ui/button";
import { Store, Minus, Square, X } from "lucide-react";

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
  const isElectron = typeof window !== 'undefined' && !!(window as any).require;

  const handleMinimize = () => {
    if (isElectron) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        ipcRenderer.send("minimize");
      } catch (err) {
        console.error("Failed to minimize:", err);
      }
    }
  };

  const handleMaximize = () => {
    if (isElectron) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        ipcRenderer.send("maximize");
      } catch (err) {
        console.error("Failed to maximize:", err);
      }
    }
  };

  const handleClose = () => {
    if (isElectron) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        ipcRenderer.send("close");
      } catch (err) {
        console.error("Failed to close:", err);
      }
    }
  };

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
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Custom Draggable Titlebar for Electron — hidden when loaded inside systemView (has own titlebar) */}
        {isElectron && !(window as any).__IN_SYSTEM_VIEW && (
          <div 
            className="flex items-center justify-between bg-card border-b border-border px-4 py-1.5 select-none shrink-0" 
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Store className="h-4 w-4 text-primary" />
              <span>Ana Food Desktop</span>
            </div>
            <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleMinimize}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleMaximize}
              >
                <Square className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div
          className={`relative flex flex-1 w-full bg-background overflow-hidden transition-opacity duration-300`}
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
      </div>
    </SidebarProvider>
  );
}
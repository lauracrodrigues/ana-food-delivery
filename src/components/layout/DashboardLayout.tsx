// v1.2.0 — suporte a fullScreen + sidebar persiste estado via cookie
import { ReactNode, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { initializeColorPalette, resetPalette } from "@/hooks/use-color-palette";

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
  useEffect(() => {
    initializeColorPalette();
    return () => resetPalette();
  }, []);

  return (
    <SidebarProvider defaultOpen={getSidebarDefaultOpen()}>
      <div className={`relative flex w-full bg-background ${fullScreen ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <AppSidebar />
        <main className={`flex-1 transition-all duration-300 lg:ml-0 pt-16 lg:pt-0 ${fullScreen ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
          {fullScreen ? (
            children
          ) : (
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
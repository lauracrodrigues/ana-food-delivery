// v1.0.0 — Componente padrão para todas as páginas do dashboard
import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  fullHeight?: boolean;
}

export function PageLayout({ title, subtitle, actions, children, fullHeight }: PageLayoutProps) {
  return (
    <div className={fullHeight ? "flex flex-col h-screen" : "flex flex-col min-h-screen"}>
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div>
                <h1 className="text-xl font-bold">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className={fullHeight ? "flex-1 overflow-auto p-6" : "flex-1 p-6"}>
        {children}
      </div>
    </div>
  );
}

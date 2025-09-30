import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="relative min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto transition-all duration-300 lg:ml-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
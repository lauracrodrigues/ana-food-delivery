import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/use-user-role";
import { Loader2 } from "lucide-react";
// v1.2.0 — usePrinterCache removido (QZ Tray descontinuado)

// ── Spinner compartilhado ────────────────────────────────────────────────────
function RoleLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// ── AdminRoute ───────────────────────────────────────────────────────────────
// Só super_admin pode acessar. Outros usuários → /dashboard. Não logado → /login
export function AdminRoute({ children }: { children: ReactNode }) {
  const { role, isLoading } = useUserRole();
  if (isLoading) return <RoleLoading />;
  if (!role) return <Navigate to="/login" replace />;
  if (role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── ClientRoute ──────────────────────────────────────────────────────────────
// Só company_admin e company_staff podem acessar.
// super_admin → /admin. Não logado → /login.
export function ClientRoute({ children }: { children: ReactNode }) {
  const { role, isLoading } = useUserRole();
  if (isLoading) return <RoleLoading />;
  if (!role) return <Navigate to="/login" replace />;
  if (role === "super_admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

// ── ProtectedRoute (legado) ──────────────────────────────────────────────────
// Mantido para compatibilidade com /users (company_admin only)
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole[];
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRole = ["company_admin"],
  fallbackPath = "/",
}: ProtectedRouteProps) {
  const { role, isLoading } = useUserRole();
  if (isLoading) return <RoleLoading />;
  if (!role || !requiredRole.includes(role)) return <Navigate to={fallbackPath} replace />;
  return <>{children}</>;
}

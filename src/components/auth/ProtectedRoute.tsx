import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/use-user-role";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole[];
  fallbackPath?: string;
}

/**
 * Component to protect routes based on user role
 * Redirects to fallbackPath if user doesn't have required role
 */
export function ProtectedRoute({ 
  children, 
  requiredRole = ["company_admin"], 
  fallbackPath = "/" 
}: ProtectedRouteProps) {
  const { role, isLoading } = useUserRole();

  // Show loading state while checking role
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Redirect if user doesn't have required role
  if (!role || !requiredRole.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}

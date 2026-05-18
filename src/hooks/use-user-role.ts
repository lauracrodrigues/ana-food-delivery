// v2.1.0 — Fix race: aguarda userId antes de decidir isLoading
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "company_admin" | "company_staff" | "super_admin";

interface UserRoleData {
  role: UserRole | null;
  companyId: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const [userId, setUserId] = useState<string | null>(null);
  // authChecked = sabemos se há ou não usuário (true após primeira resposta do auth)
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setUserId(user?.id ?? null);
        setAuthChecked(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id ?? null);
        setAuthChecked(true);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const { data: roleData, isLoading: queryLoading } = useQuery({
    queryKey: ["user-role", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", userId);

      if (error || !userRoles?.length) {
        console.error("Error fetching user role:", error);
        return null;
      }

      const roleHierarchy: Record<UserRole, number> = {
        super_admin: 3,
        company_admin: 2,
        company_staff: 1,
      };

      const primaryRole = userRoles.reduce((prev, curr) => {
        const prevPriority = roleHierarchy[prev.role as UserRole] || 0;
        const currPriority = roleHierarchy[curr.role as UserRole] || 0;
        return currPriority > prevPriority ? curr : prev;
      });

      return {
        role: primaryRole.role as UserRole,
        companyId: primaryRole.company_id ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const role = roleData?.role ?? null;
  const companyId = roleData?.companyId ?? null;

  // isLoading=true enquanto não checou auth OU tem userId mas query ainda buscando
  // Evita race: ProtectedRoute redirecionava /login antes de saber se user existe
  const isLoading = !authChecked || (!!userId && queryLoading);

  return {
    role,
    companyId,
    isAdmin: role === "company_admin",
    isStaff: role === "company_staff",
    isSuperAdmin: role === "super_admin",
    isLoading,
  };
}

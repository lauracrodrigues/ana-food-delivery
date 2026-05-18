// v2.0.0 — useUserRole scopado por user.id + invalida ao mudar de sessão
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "company_admin" | "company_staff" | "super_admin";

interface UserRoleData {
  role: UserRole | null;
  companyId: string | null; // company_id do role atual (consistente com role)
  isAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const [userId, setUserId] = useState<string | null>(null);

  // Sincroniza user atual + listen auth changes
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const { data: roleData, isLoading } = useQuery({
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

      // Highest priority role
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
    staleTime: 60 * 1000, // 1min (não 5min — minimiza janela vazamento)
  });

  const role = roleData?.role ?? null;
  const companyId = roleData?.companyId ?? null;

  return {
    role,
    companyId,
    isAdmin: role === "company_admin",
    isStaff: role === "company_staff",
    isSuperAdmin: role === "super_admin",
    isLoading,
  };
}

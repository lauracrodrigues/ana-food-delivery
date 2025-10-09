import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "company_admin" | "company_staff" | "super_admin";

interface UserRoleData {
  role: UserRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook to get the current user's role
 * Returns role information and helper booleans
 */
export function useUserRole(): UserRoleData {
  const { data: roleData, isLoading } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get user's role from user_roles table
      const { data: userRole, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || !userRole) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return userRole.role as UserRole;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const role = roleData ?? null;

  return {
    role,
    isAdmin: role === "company_admin",
    isStaff: role === "company_staff",
    isSuperAdmin: role === "super_admin",
    isLoading,
  };
}

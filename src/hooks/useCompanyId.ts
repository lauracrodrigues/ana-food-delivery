// v2.1.0 — Fix race: aguarda userId antes de declarar isLoading=false
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCompanyId = () => {
  const [userId, setUserId] = useState<string | null>(null);
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

  const { data: companyId, isLoading: queryLoading } = useQuery({
    queryKey: ['companyId', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      const profileCompanyId = profile?.company_id ?? null;
      if (!profileCompanyId) return null;

      // Cross-check security
      const { data: roles } = await supabase
        .from("user_roles")
        .select("company_id, role")
        .eq("user_id", userId);

      const isSuper = (roles || []).some(r => r.role === 'super_admin');
      if (isSuper) return profileCompanyId;

      const validCompanyIds = (roles || []).map(r => r.company_id).filter(Boolean);
      if (!validCompanyIds.includes(profileCompanyId)) {
        console.error("[SECURITY] profile.company_id não bate com user_roles:", {
          userId, profileCompanyId, validCompanyIds,
        });
        return null;
      }

      return profileCompanyId;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Race fix: enquanto auth não checou OU query carregando, isLoading=true
  const isLoading = !authChecked || (!!userId && queryLoading);

  return { companyId, isLoadingCompany: isLoading };
};

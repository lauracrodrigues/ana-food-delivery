// v2.0.0 — Hook seguro com queryKey scopado por user.id (evita vazamento entre sessões)
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCompanyId = () => {
  const [userId, setUserId] = useState<string | null>(null);

  // Captura user atual + escuta mudanças de auth — invalida cache automaticamente
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

  const { data: companyId, isLoading } = useQuery({
    // QueryKey inclui user.id — sessões diferentes nunca compartilham cache
    queryKey: ['companyId', userId],
    queryFn: async () => {
      if (!userId) return null;

      // 1. Pega profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();

      const profileCompanyId = profile?.company_id ?? null;
      if (!profileCompanyId) return null;

      // 2. Cross-check: company_id em profiles DEVE bater com user_roles do mesmo user
      // Se diferir, profile foi corrompido — força null pra bloquear acesso
      const { data: roles } = await supabase
        .from("user_roles")
        .select("company_id, role")
        .eq("user_id", userId);

      // Super admin não precisa cross-check (acessa qualquer empresa via UI)
      const isSuper = (roles || []).some(r => r.role === 'super_admin');
      if (isSuper) return profileCompanyId;

      // Demais: profile.company_id PRECISA estar em user_roles desse user
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
    staleTime: 60 * 1000, // 1min — não infinito, força refresh periódico
  });

  return { companyId, isLoadingCompany: isLoading };
};

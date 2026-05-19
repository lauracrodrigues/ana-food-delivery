// v1.0.0 — Aguarda carregamento crítico antes de mostrar dashboard
// Garante que splash screen só sai quando: profile + company + tema OK
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppContext {
  userId: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
  companyLogo: string | null;
}

/**
 * Retorna { context, isLoading, isReady, error }.
 * isReady = profile carregado, company carregada (se houver), pronto pra render.
 */
export function useInitialLoad() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["initial-load"],
    queryFn: async (): Promise<AppContext | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) {
        return {
          userId: user.id,
          email: user.email ?? "",
          companyId: null,
          companyName: null,
          companyLogo: null,
        };
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id, name, fantasy_name, logo_url")
        .eq("id", profile.company_id)
        .single();

      // Preload logo image (resolve quando img completa carregar)
      const logoUrl = (company as any)?.logo_url ?? null;
      if (logoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // continua mesmo se falhar
          img.src = logoUrl;
          // Timeout pra evitar travar carregamento se imagem demorar
          setTimeout(() => resolve(), 2000);
        });
      }

      return {
        userId: user.id,
        email: user.email ?? "",
        companyId: profile.company_id,
        companyName: (company as any)?.fantasy_name || (company as any)?.name || null,
        companyLogo: logoUrl,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    context: data,
    isLoading,
    isReady: !isLoading && !!data,
    error,
  };
}

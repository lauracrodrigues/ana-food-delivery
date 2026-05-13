// Hook para verificar quais módulos estão habilitados para a empresa atual
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "./useCompanyId";

export type ModuleKey =
  | "cardapio_digital"
  | "whatsapp"
  | "pdv"
  | "financeiro"
  | "app_entregador"
  | "distribuidoras";

// Módulos habilitados por padrão quando a empresa não tem configuração
const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  cardapio_digital: true,
  whatsapp:        true,
  pdv:             true,
  financeiro:      true,
  app_entregador:  true,
  distribuidoras:  false,
};

export function useModules() {
  const { companyId } = useCompanyId();

  const { data: modules } = useQuery({
    queryKey: ["modules", companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULT_MODULES;
      const { data } = await supabase
        .from("companies")
        .select("modules_enabled")
        .eq("id", companyId)
        .single();
      return { ...DEFAULT_MODULES, ...(data?.modules_enabled ?? {}) } as Record<ModuleKey, boolean>;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  const isEnabled = (module: ModuleKey): boolean =>
    modules ? modules[module] : DEFAULT_MODULES[module];

  return { modules: modules ?? DEFAULT_MODULES, isEnabled };
}

// v2.0.0 — Hook módulos com realtime + Mercado Pago como extra do plano
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "./useCompanyId";

export type ModuleKey =
  | "cardapio_digital"
  | "whatsapp"
  | "pdv"
  | "financeiro"
  | "app_entregador"
  | "distribuidoras"
  | "mercado_pago"; // PIX dinâmico via MP — disponível no plano Enterprise

const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  cardapio_digital: true,
  whatsapp:        true,
  pdv:             true,
  financeiro:      true,
  app_entregador:  true,
  distribuidoras:  false,
  mercado_pago:    false, // extra premium
};

export function useModules() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

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
    // staleTime reduzido pra refletir mudanças do admin sem deslogar
    staleTime: 30 * 1000, // 30s (era 5min)
    refetchOnWindowFocus: true,
  });

  // Realtime: admin altera modules_enabled → invalida cache imediato
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`company-modules-${companyId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "companies",
        filter: `id=eq.${companyId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["modules", companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, queryClient]);

  const isEnabled = (module: ModuleKey): boolean =>
    modules ? modules[module] : DEFAULT_MODULES[module];

  return { modules: modules ?? DEFAULT_MODULES, isEnabled };
}

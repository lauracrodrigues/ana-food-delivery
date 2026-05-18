// v1.0.0 — Hook que carrega feature flags do plano da empresa
// Usa RPC get_company_plan_features (SECURITY DEFINER, server-side join)
// Estrutura: { modules: string[], limits: {...}, extras: {...} }
// Limits = -1 significa ilimitado.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "./useCompanyId";

export type ExtraKey =
  | "tts"
  | "distribuidoras"
  | "app_entregador"
  | "api_access"
  | "white_label"
  | "multi_session"
  | "heatmap"
  | "analytics_pro";

export type LimitKey =
  | "products"
  | "orders_month"
  | "deliverers"
  | "wa_sessions"
  | "users";

interface PlanFeatures {
  modules: string[];
  limits: Record<LimitKey, number>;
  extras: Record<ExtraKey, boolean>;
}

// Fallback: empresa sem plano contratado → bloqueia tudo extra, libera básico
const FALLBACK: PlanFeatures = {
  modules: ["pdv", "whatsapp", "financeiro"],
  limits: { products: 10, orders_month: 30, deliverers: 1, wa_sessions: 1, users: 1 },
  extras: {
    tts: false, distribuidoras: false, app_entregador: false,
    api_access: false, white_label: false, multi_session: false,
    heatmap: false, analytics_pro: false,
  },
};

export function usePlanFeatures() {
  const { companyId } = useCompanyId();

  const { data, isLoading } = useQuery({
    queryKey: ["plan-features", companyId],
    queryFn: async (): Promise<PlanFeatures> => {
      if (!companyId) return FALLBACK;
      // RPC tipada via cast (não está nos types gerados)
      const { data: flags, error } = await supabase
        .rpc("get_company_plan_features" as any, { p_company_id: companyId });
      if (error || !flags) return FALLBACK;
      // Merge superficial com fallback (planos antigos sem feature_flags)
      return {
        modules: (flags as any).modules ?? FALLBACK.modules,
        limits:  { ...FALLBACK.limits, ...((flags as any).limits ?? {}) },
        extras:  { ...FALLBACK.extras, ...((flags as any).extras ?? {}) },
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5min — plano não muda toda hora
  });

  const features = data ?? FALLBACK;

  // Helpers de uso comum
  const hasExtra = (key: ExtraKey): boolean => features.extras[key] === true;
  const hasModule = (key: string): boolean => features.modules.includes(key);
  const getLimit = (key: LimitKey): number => features.limits[key] ?? 0;
  const isUnlimited = (key: LimitKey): boolean => getLimit(key) === -1;
  // Retorna true se contagem está dentro do limite (ou ilimitado)
  const withinLimit = (key: LimitKey, currentCount: number): boolean => {
    const lim = getLimit(key);
    return lim === -1 || currentCount < lim;
  };

  return {
    features,
    isLoading,
    hasExtra,
    hasModule,
    getLimit,
    isUnlimited,
    withinLimit,
  };
}

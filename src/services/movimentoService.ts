// services/movimentoService.ts — Wrapper RPCs movimento unificado (FASE 2)
import { supabase } from "@/integrations/supabase/client";

export type MovimentoStage = 'orcamento' | 'pedido' | 'faturado' | 'cancelado';
export type MovimentoOrigin = 'online' | 'balcao' | 'ifood';

export const movimentoService = {
  async faturar(orderId: string) {
    const { data, error } = await supabase.rpc("faturar_movimento" as any, { p_order_id: orderId });
    if (error) throw error;
    return data;
  },

  async converterOrcamentoEmPedido(orderId: string) {
    const { data, error } = await supabase.rpc("converter_orcamento_em_pedido" as any, { p_order_id: orderId });
    if (error) throw error;
    return data;
  },

  async cancelar(orderId: string, motivo?: string) {
    const { data, error } = await supabase.rpc("cancelar_movimento" as any, { p_order_id: orderId, p_motivo: motivo ?? null });
    if (error) throw error;
    return data;
  },

  async listOrcamentos(companyId: string) {
    const { data, error } = await supabase.from("v_orcamentos" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listPedidosAtivos(companyId: string) {
    const { data, error } = await supabase.from("v_pedidos_ativos" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async listFaturados(companyId: string, days = 30) {
    const dataInicio = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase.from("v_movimentos_faturados" as any)
      .select("*")
      .eq("company_id", companyId)
      .gte("created_at", dataInicio)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
};

// services/caixaService.ts — Wrapper RPCs caixa (FASE 3)
import { supabase } from "@/integrations/supabase/client";

export interface CaixaStatus {
  aberto: boolean;
  caixa_id?: string;
  aberto_em?: string;
  operador?: string;
  valor_inicial?: number;
  total_entradas?: number;
  total_saidas?: number;
  saldo_esperado?: number;
  movimentos?: Array<{
    id: string;
    tipo: string;
    valor: number;
    sinal: 1 | -1;
    motivo: string | null;
    created_at: string;
  }>;
}

export interface FechamentoResult {
  success: boolean;
  valor_inicial: number;
  total_entradas: number;
  total_saidas: number;
  valor_sistema: number;
  valor_contado: number;
  quebra: number;
  quebra_status: 'ok' | 'sobra' | 'falta';
}

export const caixaService = {
  async abrir(companyId: string, valorInicial: number, operadorNome?: string) {
    const { data, error } = await supabase.rpc("abrir_caixa" as any, {
      p_company_id: companyId,
      p_valor_inicial: valorInicial,
      p_operador_nome: operadorNome ?? null,
    });
    if (error) throw error;
    return data;
  },

  async getAtual(companyId: string): Promise<CaixaStatus> {
    const { data, error } = await supabase.rpc("get_caixa_atual" as any, { p_company_id: companyId });
    if (error) throw error;
    return data as CaixaStatus;
  },

  async registrarMovimento(
    companyId: string,
    tipo: 'suprimento' | 'sangria_despesa' | 'sangria_cofre' | 'ajuste',
    valor: number,
    motivo?: string,
  ) {
    const { data, error } = await supabase.rpc("registrar_movimento_caixa" as any, {
      p_company_id: companyId,
      p_tipo: tipo,
      p_valor: valor,
      p_motivo: motivo ?? null,
    });
    if (error) throw error;
    return data;
  },

  async fechar(caixaId: string, valorContado: number): Promise<FechamentoResult> {
    const { data, error } = await supabase.rpc("fechar_caixa" as any, {
      p_caixa_id: caixaId,
      p_valor_contado: valorContado,
    });
    if (error) throw error;
    return data as FechamentoResult;
  },

  async historico(companyId: string, limit = 30) {
    const { data, error } = await supabase
      .from("fin_caixa" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("aberto_em", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },
};

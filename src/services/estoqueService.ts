// services/estoqueService.ts — Wrapper RPCs camada estoque (FASE 1)
import { supabase } from "@/integrations/supabase/client";

export interface MateriaPrima {
  id: string;
  company_id: string;
  nome: string;
  unidade_estoque: 'UN' | 'KG' | 'L' | 'G' | 'ML';
  controla_lote: boolean;
  saldo: number;
  custo_medio: number;
  estoque_minimo: number | null;
  is_active: boolean;
}

export interface Lote {
  id: string;
  materia_prima_id: string;
  codigo: string | null;
  fornecedor_nome: string | null;
  caminhao: string | null;
  qtd_esperada: number;
  qtd_recebida: number;
  qtd_vendida: number;
  qtd_perda: number;
  custo_total: number;
  status: 'aberto' | 'esgotado' | 'fechado';
  ordem_fifo: number;
  data_recebimento: string;
}

export interface BalancoLote {
  lote_id: string;
  codigo: string | null;
  fornecedor: string | null;
  esperado: number;
  recebido: number;
  vendido: number;
  perda: number;
  saldo_atual: number;
  diferenca_recebimento: number;
  status: string;
  custo_total: number;
  custo_unitario: number;
}

export const estoqueService = {
  // Lista matérias-primas ativas
  async listMateriaPrima(companyId: string): Promise<MateriaPrima[]> {
    const { data, error } = await supabase
      .from("estoque_materia_prima" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("nome");
    if (error) throw error;
    return (data || []) as unknown as MateriaPrima[];
  },

  async createMateriaPrima(payload: Partial<MateriaPrima>): Promise<MateriaPrima> {
    const { data, error } = await supabase
      .from("estoque_materia_prima" as any)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as MateriaPrima;
  },

  async listLotes(companyId: string, materiaPrimaId?: string): Promise<Lote[]> {
    let q = supabase.from("estoque_lotes" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("ordem_fifo", { ascending: true });
    if (materiaPrimaId) q = q.eq("materia_prima_id", materiaPrimaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as Lote[];
  },

  async balancoLote(loteId: string): Promise<BalancoLote> {
    const { data, error } = await supabase.rpc("estoque_balanco_lote" as any, { p_lote_id: loteId });
    if (error) throw error;
    return data as BalancoLote;
  },

  async baixarPorOrder(orderId: string): Promise<any> {
    const { data, error } = await supabase.rpc("baixa_estoque_por_order" as any, { p_order_id: orderId });
    if (error) throw error;
    return data;
  },

  // Composição
  async listComposicao(productId: string) {
    const { data, error } = await supabase
      .from("estoque_composicao" as any)
      .select("*, materia_prima:estoque_materia_prima(nome, unidade_estoque)")
      .eq("product_id", productId);
    if (error) throw error;
    return data || [];
  },

  async setComposicao(companyId: string, productId: string, mpId: string, qtdPorUnidade: number) {
    const { data, error } = await supabase
      .from("estoque_composicao" as any)
      .upsert({ company_id: companyId, product_id: productId, materia_prima_id: mpId, qtd_por_unidade: qtdPorUnidade })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Perda
  async registrarPerda(payload: { company_id: string; materia_prima_id: string; lote_id?: string; qtd: number; motivo: string }) {
    const { data, error } = await supabase.from("estoque_perdas" as any).insert(payload).select().single();
    if (error) throw error;
    return data;
  },
};

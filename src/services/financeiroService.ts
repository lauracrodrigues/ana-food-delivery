// services/financeiroService.ts — Wrapper financeiro aprofundado (FASE 4)
import { supabase } from "@/integrations/supabase/client";

export interface FinConta {
  id: string;
  nome: string;
  tipo: 'caixa' | 'cofre' | 'banco' | 'carteira' | 'cartao_credito';
  saldo: number;
  is_active: boolean;
  is_default: boolean;
  banco?: string;
  agencia?: string;
  conta_num?: string;
}

export interface FinCategoria {
  id: string;
  parent_id: string | null;
  nome: string;
  tipo: 'receita' | 'despesa';
  codigo: string | null;
  is_system: boolean;
}

export interface FinLancamento {
  id: string;
  conta_id: string;
  categoria_id: string | null;
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string | null;
  data_competencia: string;
  data_caixa: string | null;
  origem: string;
  order_id?: string;
  titulo_id?: string;
}

export interface DreLine {
  mes: string;
  tipo_categoria: 'receita' | 'despesa';
  categoria: string;
  codigo: string | null;
  total: number;
}

export interface FluxoCaixaLine {
  conta_id: string;
  conta: string;
  dia: string;
  entradas: number;
  saidas: number;
  saldo_dia: number;
}

export const financeiroService = {
  // CONTAS
  async listContas(companyId: string): Promise<FinConta[]> {
    const { data, error } = await supabase.from("fin_contas" as any)
      .select("*").eq("company_id", companyId).eq("is_active", true).order("is_default", { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as FinConta[];
  },

  async createConta(payload: Partial<FinConta> & { company_id: string }) {
    const { data, error } = await supabase.from("fin_contas" as any).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // CATEGORIAS
  async listCategorias(companyId: string, tipo?: 'receita' | 'despesa'): Promise<FinCategoria[]> {
    let q = supabase.from("fin_categorias" as any)
      .select("*").eq("company_id", companyId).eq("is_active", true).order("codigo");
    if (tipo) q = q.eq("tipo", tipo);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as FinCategoria[];
  },

  async createCategoria(payload: Partial<FinCategoria> & { company_id: string; nome: string; tipo: 'receita' | 'despesa' }) {
    const { data, error } = await supabase.from("fin_categorias" as any).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async seedCategorias(companyId: string) {
    const { data, error } = await supabase.rpc("seed_fin_categorias" as any, { p_company_id: companyId });
    if (error) throw error;
    return data;
  },

  // LANÇAMENTOS
  async listLancamentos(companyId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
    let q = supabase.from("fin_lancamentos" as any)
      .select("*, conta:fin_contas(nome), categoria:fin_categorias(nome, tipo)")
      .eq("company_id", companyId)
      .order("data_competencia", { ascending: false });
    if (opts.from) q = q.gte("data_competencia", opts.from);
    if (opts.to) q = q.lte("data_competencia", opts.to);
    q = q.limit(opts.limit ?? 100);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async createLancamento(payload: Partial<FinLancamento> & { company_id: string; conta_id: string; tipo: 'entrada' | 'saida'; valor: number; data_competencia: string }) {
    const { data, error } = await supabase.from("fin_lancamentos" as any).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // TRANSFERÊNCIAS
  async criarTransferencia(companyId: string, contaOrigemId: string, contaDestinoId: string, valor: number, descricao?: string) {
    const { data, error } = await supabase.rpc("criar_transferencia" as any, {
      p_company_id: companyId,
      p_conta_origem: contaOrigemId,
      p_conta_destino: contaDestinoId,
      p_valor: valor,
      p_descricao: descricao ?? null,
    });
    if (error) throw error;
    return data;
  },

  // RELATÓRIOS
  async getDRE(companyId: string, mes?: string): Promise<DreLine[]> {
    let q = supabase.from("v_dre" as any).select("*").eq("company_id", companyId);
    if (mes) q = q.eq("mes", mes);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as DreLine[];
  },

  async getFluxoCaixa(companyId: string, from?: string, to?: string): Promise<FluxoCaixaLine[]> {
    let q = supabase.from("v_fluxo_caixa" as any).select("*").eq("company_id", companyId).order("dia", { ascending: false });
    if (from) q = q.gte("dia", from);
    if (to) q = q.lte("dia", to);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as FluxoCaixaLine[];
  },
};

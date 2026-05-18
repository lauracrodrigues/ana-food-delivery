// services/tituloService.ts — Contas a pagar/receber + fiado (FASE 4)
import { supabase } from "@/integrations/supabase/client";

export interface FinTitulo {
  id: string;
  tipo: 'pagar' | 'receber';
  cliente_id?: string;
  fornecedor_id?: string;
  contraparte_nome: string;
  valor_original: number;
  valor_pago: number;
  saldo: number; // computed
  data_emissao: string;
  data_vencimento: string;
  data_baixa_completa?: string;
  status: 'aberto' | 'parcial' | 'pago' | 'cancelado';
  status_real?: 'aberto' | 'parcial' | 'pago' | 'cancelado' | 'vencido';
  numero_documento?: string;
  descricao?: string;
  dias_vencimento?: number; // de v_titulos_abertos
}

export interface BaixaResult {
  success: boolean;
  titulo_id: string;
  lancamento_id: string;
  valor_baixado: number;
  novo_saldo: number;
  status: 'parcial' | 'pago';
}

export const tituloService = {
  // Listagens
  async listAberto(companyId: string, tipo?: 'pagar' | 'receber'): Promise<FinTitulo[]> {
    let q = supabase.from("v_titulos_abertos" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("data_vencimento", { ascending: true });
    if (tipo) q = q.eq("tipo", tipo);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as unknown as FinTitulo[];
  },

  async listTodos(companyId: string, opts: { tipo?: 'pagar' | 'receber'; status?: string; limit?: number } = {}) {
    let q = supabase.from("fin_titulos" as any).select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (opts.tipo) q = q.eq("tipo", opts.tipo);
    if (opts.status) q = q.eq("status", opts.status);
    q = q.limit(opts.limit ?? 100);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async create(payload: Partial<FinTitulo> & { company_id: string; tipo: 'pagar' | 'receber'; valor_original: number; data_vencimento: string }) {
    const { data, error } = await supabase.from("fin_titulos" as any).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async baixar(tituloId: string, valor: number, contaId: string, dataCaixa?: string): Promise<BaixaResult> {
    const { data, error } = await supabase.rpc("baixar_titulo" as any, {
      p_titulo_id: tituloId,
      p_valor: valor,
      p_conta_id: contaId,
      p_data_caixa: dataCaixa ?? new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
    return data as BaixaResult;
  },

  async cancelar(tituloId: string) {
    const { error } = await supabase.from("fin_titulos" as any)
      .update({ status: 'cancelado' })
      .eq("id", tituloId);
    if (error) throw error;
  },

  // Saldo devedor por cliente (fiado)
  async saldoDevedorCliente(companyId: string, clienteId: string): Promise<number> {
    const { data, error } = await supabase.from("fin_titulos" as any)
      .select("saldo")
      .eq("company_id", companyId)
      .eq("cliente_id", clienteId)
      .eq("tipo", "receber")
      .in("status", ["aberto", "parcial"]);
    if (error) throw error;
    return (data || []).reduce((acc: number, t: any) => acc + Number(t.saldo || 0), 0);
  },
};

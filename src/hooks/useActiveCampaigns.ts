// v1.0.0 — Carrega campanhas ativas da empresa + aplica desconto contextual
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  scope: "all" | "category" | "products";
  category_ids: string[];
  product_ids: string[];
  valid_days_of_week: number[];
  valid_start_time: string;
  valid_end_time: string;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

// Converte "HH:MM[:SS]" pra minutos do dia (pra comparar)
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Verifica se campanha está dentro da janela atual de validade
function isCampaignActiveNow(c: Campaign, now: Date = new Date()): boolean {
  if (!c.is_active) return false;

  // Janela absoluta (valid_from/valid_until — datas)
  const today = now.toISOString().slice(0, 10);
  if (c.valid_from && today < c.valid_from) return false;
  if (c.valid_until && today > c.valid_until) return false;

  // Dia da semana
  if (c.valid_days_of_week.length > 0 && !c.valid_days_of_week.includes(now.getDay())) return false;

  // Horário
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(c.valid_start_time);
  const end = toMinutes(c.valid_end_time);
  // Janela cruzando meia-noite (ex: 22:00 → 02:00)
  if (end < start) return cur >= start || cur <= end;
  return cur >= start && cur <= end;
}

interface ProductLite {
  id: string;
  price: number;
  category_id: string;
  promotional_price?: number | null;
}

export interface CampaignDiscount {
  campaignId: string;
  campaignName: string;
  effectivePrice: number;
  originalPrice: number;
  discountValue: number;
  discountType: "percentage" | "fixed";
}

export function useActiveCampaigns(companyId: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("campaigns" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);
    setCampaigns((data as any) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Re-filtra a cada minuto (campanha pode entrar/sair de janela)
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Campanhas atualmente ativas (janela horário/dia bate)
  const activeNow = useMemo(() => {
    return campaigns.filter(c => isCampaignActiveNow(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, nowTick]);

  // Aplica desconto ao produto se houver campanha matching.
  // Prioridade: scope=products > scope=category > scope=all.
  // Não acumula com promotional_price (escolhe o melhor preço final).
  const getDiscount = useCallback((product: ProductLite): CampaignDiscount | null => {
    if (activeNow.length === 0) return null;

    // Filtra campanhas que aplicam a este produto
    const matching = activeNow.filter(c => {
      if (c.scope === "products") return c.product_ids.includes(product.id);
      if (c.scope === "category") return c.category_ids.includes(product.category_id);
      return c.scope === "all";
    });
    if (matching.length === 0) return null;

    // Preço base: promotional_price se houver, senão price
    const basePrice = product.promotional_price ?? product.price;

    // Calcula o melhor desconto (menor preço final)
    let best: CampaignDiscount | null = null;
    for (const c of matching) {
      const discount = c.discount_type === "percentage"
        ? basePrice * (c.discount_value / 100)
        : c.discount_value;
      const effective = Math.max(0, basePrice - discount);
      if (!best || effective < best.effectivePrice) {
        best = {
          campaignId: c.id,
          campaignName: c.name,
          effectivePrice: effective,
          originalPrice: product.price,
          discountValue: c.discount_value,
          discountType: c.discount_type,
        };
      }
    }
    return best;
  }, [activeNow]);

  return { campaigns, activeNow, getDiscount, loading, reload: load };
}

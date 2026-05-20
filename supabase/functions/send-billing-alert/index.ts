// v1.0.0 — Verifica saldo de API por provider, envia alerta WhatsApp se ≥ threshold
// Pode ser chamado via cron (todos alerts) ou manual (alert_id específico + test:true)
import { serve } from "https://deno.land/std@0.220.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRow {
  id: string;
  provider: string;
  monthly_budget_usd: number;
  alert_threshold_pct: number;
  alert_phone: string;
  alert_instance: string;
  enabled: boolean;
  last_alerted_at: string | null;
  last_usage_pct: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVO_URL      = Deno.env.get("EVOLUTION_API_URL") || "https://evo.anafood.vip";
    const EVO_KEY      = Deno.env.get("EVOLUTION_API_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { alert_id, test } = body;

    // Busca alertas (todos ou específico)
    let q = sb.from("api_billing_alerts").select("*").eq("enabled", true);
    if (alert_id) q = sb.from("api_billing_alerts").select("*").eq("id", alert_id);
    const { data: alerts, error: e1 } = await q;
    if (e1) throw new Error(e1.message);
    if (!alerts?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, msg: "nenhum alerta ativo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mês corrente
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    let sent = 0;
    const log: any[] = [];

    for (const a of alerts as AlertRow[]) {
      // Soma custo do provider no mês
      const { data: logs } = await sb
        .from("token_logs")
        .select("custo_usd")
        .eq("provider", a.provider)
        .gte("criado_em", monthStart.toISOString());

      const usedUsd = (logs || []).reduce((s, l) => s + (Number(l.custo_usd) || 0), 0);
      const pct = a.monthly_budget_usd > 0 ? (usedUsd / a.monthly_budget_usd) * 100 : 0;

      // Atualiza last_usage_pct sempre
      await sb.from("api_billing_alerts").update({ last_usage_pct: pct }).eq("id", a.id);

      const triggered = pct >= a.alert_threshold_pct;

      // Anti-spam: só alerta novamente após 24h
      const last = a.last_alerted_at ? new Date(a.last_alerted_at).getTime() : 0;
      const horasDesdeUltimo = (Date.now() - last) / (1000 * 60 * 60);
      const podeAlertar = horasDesdeUltimo >= 24;

      if ((triggered && podeAlertar) || test) {
        // Monta mensagem
        const restanteUsd = Math.max(0, a.monthly_budget_usd - usedUsd);
        const restantePct = 100 - pct;
        const msg = test
          ? `🧪 TESTE — Alerta de saldo API\n\n` +
            `Provider: *${a.provider.toUpperCase()}*\n` +
            `Saldo mensal: $${a.monthly_budget_usd.toFixed(2)}\n` +
            `Usado: $${usedUsd.toFixed(4)} (${pct.toFixed(1)}%)\n` +
            `Restante: $${restanteUsd.toFixed(2)} (${restantePct.toFixed(1)}%)\n\n` +
            `Este é um teste — não exige ação.`
          : `⚠️ *ALERTA DE SALDO API*\n\n` +
            `Provider: *${a.provider.toUpperCase()}*\n` +
            `Saldo mensal: $${a.monthly_budget_usd.toFixed(2)}\n` +
            `Usado: $${usedUsd.toFixed(4)} (${pct.toFixed(1)}%)\n` +
            `Restante: $${restanteUsd.toFixed(2)} (${restantePct.toFixed(1)}%)\n\n` +
            `🚨 Você atingiu *${a.alert_threshold_pct}%* do limite mensal.\n` +
            `Recomendado adicionar saldo ou ajustar limite.`;

        // Envia via Evolution
        const r = await fetch(
          `${EVO_URL}/message/sendText/${encodeURIComponent(a.alert_instance)}`,
          {
            method: "POST",
            headers: { apikey: EVO_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
              number: a.alert_phone,
              text: msg,
            }),
          }
        );

        if (r.ok) {
          if (!test) {
            await sb.from("api_billing_alerts")
              .update({ last_alerted_at: new Date().toISOString() })
              .eq("id", a.id);
          }
          sent++;
          log.push({ provider: a.provider, pct: pct.toFixed(1), sent: true, test: !!test });
        } else {
          const errText = await r.text();
          log.push({ provider: a.provider, sent: false, error: errText });
        }
      } else {
        log.push({ provider: a.provider, pct: pct.toFixed(1), sent: false, reason: !triggered ? "below threshold" : "cooldown" });
      }
    }

    return new Response(JSON.stringify({ success: true, sent, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

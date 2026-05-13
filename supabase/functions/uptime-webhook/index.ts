// v2.1.0 — Uptime Kuma webhook: WhatsApp + SMS (TextBelt)
// Email é configurado diretamente no Uptime Kuma via SMTP nativo
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const EVOLUTION_BASE_URL = "https://evo.anafood.vip";
const OWNER_PHONE = "5562992271019";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expectedToken = Deno.env.get("UPTIME_WEBHOOK_TOKEN");

  if (!expectedToken || token !== expectedToken) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const status: number = body?.heartbeat?.status ?? body?.status ?? -1;
  const monitorName: string = body?.monitor?.name ?? body?.monitorName ?? "Monitor";
  const monitorUrl: string = body?.monitor?.url ?? body?.monitorURL ?? "";
  const msg: string = body?.msg ?? body?.heartbeat?.msg ?? "";
  const isDown = status === 0;
  const isUp = status === 1;

  if (!isDown && !isUp) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const waMessage = isDown
    ? [`🚨 *ALERTA — Serviço FORA DO AR!*`, ``, `📍 *${monitorName}*`,
        monitorUrl ? `🔗 ${monitorUrl}` : "", `❌ Status: *DOWN*`,
        msg ? `📝 ${msg}` : "", ``, `⏰ ${now}`].filter(Boolean).join("\n")
    : [`✅ *Serviço de volta ao ar!*`, ``, `📍 *${monitorName}*`,
        monitorUrl ? `🔗 ${monitorUrl}` : "", `✅ Status: *UP*`,
        ``, `⏰ ${now}`].filter(Boolean).join("\n");

  const smsText = isDown
    ? `ALERTA: ${monitorName} FORA DO AR. ${now}`
    : `OK: ${monitorName} voltou ao ar. ${now}`;

  const results: Record<string, any> = {};

  // 1. WhatsApp via Evolution API
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const EVOLUTION_INSTANCE = Deno.env.get("UPTIME_EVOLUTION_INSTANCE") || "tim";
  if (EVOLUTION_API_KEY) {
    try {
      const r = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: "POST",
        headers: { "apikey": EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ number: OWNER_PHONE, text: waMessage }),
      });
      results.whatsapp = r.status;
    } catch (e) { results.whatsapp_error = String(e); }
  }

  // 2. SMS via TextBelt (key "textbelt" = 1 grátis/dia; configure TEXTBELT_API_KEY para ilimitado)
  const TEXTBELT_KEY = Deno.env.get("TEXTBELT_API_KEY") || "textbelt";
  try {
    const r = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `+${OWNER_PHONE}`, message: smsText, key: TEXTBELT_KEY }),
    });
    const smsResult = await r.json();
    results.sms = smsResult;
  } catch (e) { results.sms_error = String(e); }

  console.log("[uptime-webhook] Resultados:", JSON.stringify(results));
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { "Content-Type": "application/json" },
  });
});

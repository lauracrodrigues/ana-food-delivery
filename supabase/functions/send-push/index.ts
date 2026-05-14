// v1.0.0 — Envia Web Push para clientes do cardápio quando status do pedido muda
// Triggers possíveis:
//   1. POST { order_id, status } — derivado do pedido (caso comum)
//   2. POST { company_id, customer_phone, title, body, url? } — direto
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mensagens por status — copy curto pra notificação push
const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed:  { title: "Pedido confirmado! ✅",   body: "Estamos preparando seu pedido." },
  preparing:  { title: "Preparando seu pedido 👨‍🍳", body: "A cozinha já está com tudo!" },
  ready:      { title: "Pedido pronto! 🍱",       body: "Aguarde a saída para entrega." },
  delivering: { title: "Saiu para entrega 🛵",    body: "Seu pedido está a caminho." },
  delivered:  { title: "Pedido entregue! 🎉",     body: "Bom apetite!" },
  cancelled:  { title: "Pedido cancelado",         body: "Entraremos em contato em breve." },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Configura VAPID (secrets configurados via wrangler/dashboard)
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:maissistem@gmail.com";
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: "VAPID keys ausentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const body = await req.json();
    let companyId: string | undefined = body.company_id;
    let customerPhone: string | undefined = body.customer_phone;
    let title: string = body.title;
    let bodyText: string = body.body;
    let url: string = body.url ?? "/";
    let orderId: string | undefined = body.order_id;
    let subdomain: string | undefined = body.subdomain;

    // Caso 1: order_id + status — busca dados, monta mensagem
    if (orderId && body.status) {
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, company_id, customer_phone, customer_name, status, companies(subdomain, fantasy_name, name)")
        .eq("id", orderId)
        .maybeSingle();
      if (error || !order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const msg = STATUS_MESSAGES[body.status];
      if (!msg) {
        return new Response(JSON.stringify({ skipped: true, reason: "status sem mensagem" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      companyId = order.company_id;
      customerPhone = order.customer_phone;
      title = msg.title;
      bodyText = msg.body;
      // @ts-ignore  Supabase nested
      subdomain = order.companies?.subdomain ?? subdomain;
      url = subdomain ? `https://${subdomain}.anafood.vip/?order=${orderId}` : "/";
    }

    if (!companyId || !customerPhone || !title || !bodyText) {
      return new Response(JSON.stringify({ error: "Parâmetros insuficientes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Busca todas subscriptions do cliente+empresa
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("company_id", companyId)
      .eq("customer_phone", customerPhone);
    if (subsError) throw subsError;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "sem subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = JSON.stringify({ title, body: bodyText, url, orderId, subdomain });
    let sent = 0;
    const expiredIds: string[] = [];

    // Envia para cada subscription. Endpoints 404/410 = subscription expirada → deletar
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload);
        sent++;
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          expiredIds.push(s.id);
        } else {
          console.warn("send-push falhou", s.endpoint, code, err?.body);
        }
      }
    }));

    // Limpa subscriptions expiradas
    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return new Response(JSON.stringify({ sent, expired: expiredIds.length, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("send-push erro", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

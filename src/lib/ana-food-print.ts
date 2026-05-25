// v1.0.1 — Cliente JS pro gateway Ana Food Print (agente desktop oficial)
// Envia jobs ao backend que despacha via WebSocket pros agentes desktop
// v1.0.1: auto-refresh sessão se token expirou (evita falha 1ª impressão após inatividade)
import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.anafood.vip";

export type PrintSector = "caixa" | "cozinha_1" | "cozinha_2" | "cozinha_3" | "copa_bar";

interface QueueJobInput {
  sector: PrintSector;
  payload: any;           // texto pronto OU objeto pedido
  device_id?: string;     // opcional: device específico
  copies?: number;
}

// Pega token fresco — se expirou, força refresh antes de retornar
async function getFreshToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  // expires_at é unix seconds. Renova se faltam < 60s
  const expSec = session.expires_at || 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expSec - nowSec < 60) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) return session.access_token; // tenta com o velho
    return data.session.access_token;
  }
  return session.access_token;
}

async function postPrint(token: string, input: QueueJobInput) {
  return fetch(`${API_BASE}/api/print/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export async function queuePrintJob(input: QueueJobInput): Promise<{ ok: boolean; error?: string }> {
  try {
    let token = await getFreshToken();
    if (!token) return { ok: false, error: "no_session" };

    let res = await postPrint(token, input);

    // 401 → token rejeitado → refresh forçado + retry 1x
    if (res.status === 401) {
      const { data } = await supabase.auth.refreshSession();
      token = data.session?.access_token || null;
      if (!token) return { ok: false, error: "session_expired" };
      res = await postPrint(token, input);
    }

    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: txt || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: !!data.ok };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/**
 * Verifica se a loja tem pelo menos um agente Ana Food Print online.
 * Mantém compat com check legado.
 */
export async function hasOnlineDevice(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("printer_devices")
      .select("id")
      .eq("status", "online")
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

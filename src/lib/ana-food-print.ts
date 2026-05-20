// v1.0.0 — Cliente JS pro gateway Ana Food Print (substitui/complementa QZ Tray)
// Envia jobs ao backend que despacha via WebSocket pros agentes desktop
import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.anafood.vip";

export type PrintSector = "caixa" | "cozinha_1" | "cozinha_2" | "cozinha_3" | "copa_bar";

interface QueueJobInput {
  sector: PrintSector;
  payload: any;           // texto pronto OU objeto pedido
  device_id?: string;     // opcional: device específico
  copies?: number;
}

export async function queuePrintJob(input: QueueJobInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, error: "no_session" };

    const res = await fetch(`${API_BASE}/api/print/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(input),
    });

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
 * Usado para decidir entre QZ Tray (legado) e gateway novo.
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

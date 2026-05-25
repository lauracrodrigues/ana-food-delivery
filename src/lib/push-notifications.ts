// v1.0.0 — Helper Web Push pra entregadores
import { supabase } from "@/integrations/supabase/client";

const API_BASE = "https://api.anafood.vip";
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC;

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function isPushSupported(): Promise<boolean> {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC;
}

export async function getPushStatus(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!(await isPushSupported())) return "unsupported";
  return Notification.permission;
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!(await isPushSupported())) return { ok: false, error: "Push não suportado neste browser" };

    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Permissão negada" };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: "Sessão expirada" };

    // v1.0.1 — envia companyId selecionado (suporte multi-loja pra entregadores)
    const selectedCompany = localStorage.getItem("anafood-deliverer-company-id");
    const r = await fetch(`${API_BASE}/api/deliveries/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        subscription: sub,
        user_agent: navigator.userAgent,
        companyId: selectedCompany || undefined,
      }),
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return { ok: false, error: errBody.detail || errBody.error || `Falha registrar: HTTP ${r.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function disablePush(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${API_BASE}/api/deliveries/push/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ endpoint }),
        });
      }
    }
  } catch (_) { /* noop */ }
}

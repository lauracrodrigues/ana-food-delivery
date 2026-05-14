// v1.0.0 — Gerencia assinatura Web Push (VAPID) do cardápio público
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// VAPID public key (par com a private key no secret VAPID_PRIVATE_KEY do Supabase)
const VAPID_PUBLIC_KEY = "BAm7Hp1xAQ2TbdZGRwoz1oh-2r0xl8URuL9HQ84FJ3auPMBjI4iTrpseyVikg_DnmpRJHrYr2DJpvx3Ls0Ipt0Q";

type PushStatus = "unsupported" | "denied" | "default" | "granted-not-subscribed" | "subscribed";

// Converte VAPID base64 url-safe para Uint8Array (formato esperado por PushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription(companyId: string, customerPhone: string | null | undefined) {
  const [status, setStatus] = useState<PushStatus>("default");
  const [loading, setLoading] = useState(false);

  // Detecta suporte + estado atual de subscription
  const refreshStatus = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setStatus("denied"); return; }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setStatus("subscribed");
      else if (Notification.permission === "granted") setStatus("granted-not-subscribed");
      else setStatus("default");
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  // Pede permissão + cria subscription + salva no Supabase
  const subscribe = async (): Promise<boolean> => {
    if (!companyId || !customerPhone) return false;
    if (status === "unsupported" || status === "denied") return false;

    setLoading(true);
    try {
      // Permissão
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return false;
      }

      const reg = await navigator.serviceWorker.ready;

      // Reusa subscription existente se houver
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Extrai chaves p256dh/auth da subscription
      const subJson = sub.toJSON();
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;
      if (!p256dh || !auth) throw new Error("Subscription sem keys p256dh/auth");

      // Upsert no Supabase (endpoint é UNIQUE)
      const { error } = await supabase.from("push_subscriptions" as any).upsert({
        company_id: companyId,
        customer_phone: customerPhone,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        last_used: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) throw error;

      setStatus("subscribed");
      return true;
    } catch (err) {
      console.warn("Push subscribe falhou", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancela subscription local + remove do Supabase
  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus(Notification.permission === "granted" ? "granted-not-subscribed" : "default");
    } catch (err) {
      console.warn("Push unsubscribe falhou", err);
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, subscribe, unsubscribe, refreshStatus };
}

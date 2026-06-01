// v1.0.0 — Hook detecta online/offline + heartbeat real
// navigator.onLine só checa interface de rede; heartbeat valida API alcançável
import { useEffect, useState } from "react";

const API_HEALTH_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/health`
  : "https://api.anafood.vip/health";

export type ConnectionState = "online" | "online_unstable" | "offline" | "offline_long";

export function useOnlineStatus() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [state, setState] = useState<ConnectionState>("online");
  const [offlineSince, setOfflineSince] = useState<number | null>(null);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  // Heartbeat real (30s) — valida que API alcançável
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let failCount = 0;

    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        await fetch(API_HEALTH_URL, { signal: ctrl.signal, cache: "no-store" });
        clearTimeout(t);
        failCount = 0;
        setOnline(true);
        setOfflineSince(null);
      } catch {
        failCount++;
        if (failCount >= 2) {
          setOnline(false);
          setOfflineSince(prev => prev ?? Date.now());
        }
      }
    };

    ping();
    timer = setInterval(ping, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Estado derivado
  useEffect(() => {
    if (online) {
      setState("online");
      setOfflineSince(null);
      return;
    }
    if (!offlineSince) {
      setState("offline");
      return;
    }
    const ms = Date.now() - offlineSince;
    if (ms < 5 * 60 * 1000) setState("offline");
    else setState("offline_long");
  }, [online, offlineSince]);

  return { online, state, offlineSince };
}

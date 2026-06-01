// v1.0.0 — Banner global offline (Fase 3A ecossistema)
// Mostra estado de conexão + tempo offline
import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, AlertTriangle } from "lucide-react";

export function OfflineBanner() {
  const { online, state, offlineSince } = useOnlineStatus();
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (online || !offlineSince) {
      setDuration("");
      return;
    }
    const update = () => {
      const ms = Date.now() - offlineSince;
      const min = Math.floor(ms / 60_000);
      const h = Math.floor(min / 60);
      if (h > 0) setDuration(`${h}h ${min % 60}min`);
      else setDuration(`${min}min`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [online, offlineSince]);

  if (online) return null;

  const isLong = state === "offline_long";

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-md ${
        isLong
          ? "bg-red-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      {isLong ? <AlertTriangle className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <span>
        {isLong
          ? `Sem conexão há ${duration} — dados podem estar desatualizados`
          : `Modo offline — operações salvas localmente${duration ? ` (${duration})` : ""}`}
      </span>
    </div>
  );
}

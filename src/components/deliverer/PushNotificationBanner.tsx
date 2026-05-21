// v1.0.0 — Banner pra ativar push notification (entregador recebe alerta de rota)
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";
import { enablePush, getPushStatus, isPushSupported } from "@/lib/push-notifications";

export function PushNotificationBanner() {
  const { toast } = useToast();
  const [status, setStatus] = useState<"granted" | "denied" | "default" | "unsupported" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    isPushSupported().then(() => getPushStatus().then(setStatus));
    const d = localStorage.getItem("push_banner_dismissed");
    if (d === "1") setDismissed(true);
  }, []);

  if (status === "granted" || status === "denied" || status === "unsupported" || dismissed || status === null) {
    return null;
  }

  const handleEnable = async () => {
    setEnabling(true);
    const r = await enablePush();
    setEnabling(false);
    if (r.ok) {
      toast({ title: "✅ Notificações ativadas", description: "Você receberá alertas de nova rota disponível." });
      setStatus("granted");
    } else {
      toast({ title: "Falha", description: r.error, variant: "destructive" });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("push_banner_dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Bell className="h-4 w-4 shrink-0" />
        <div className="text-sm min-w-0">
          <p className="font-medium">Ativar alertas?</p>
          <p className="text-xs text-white/80 truncate">Receba notificação quando rota nova aparecer</p>
        </div>
      </div>
      <Button onClick={handleEnable} disabled={enabling} size="sm" variant="secondary" className="shrink-0 h-8 text-xs">
        {enabling ? "..." : "Ativar"}
      </Button>
      <button onClick={handleDismiss} className="text-white/60 hover:text-white shrink-0" title="Dispensar">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

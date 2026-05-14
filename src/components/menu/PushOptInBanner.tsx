// v1.0.0 — Banner pra ativar push notifications de status do pedido
import { useState } from "react";
import { Bell, X, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const DISMISSED_KEY = "anafood_push_dismissed";

interface PushOptInBannerProps {
  companyId: string;
  customerPhone: string;
}

export function PushOptInBanner({ companyId, customerPhone }: PushOptInBannerProps) {
  const { status, loading, subscribe } = usePushSubscription(companyId, customerPhone);
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISSED_KEY));

  // Casos onde NÃO mostra: sem suporte, já inscrito, dispensado nesta sessão
  if (status === "unsupported" || status === "subscribed" || dismissed) return null;

  // Permissão negada: mostra como ajudar
  if (status === "denied") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-3">
        <BellOff className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-medium text-amber-900">Notificações bloqueadas</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Pra receber atualizações: clique no cadeado da barra do navegador → permitir notificações
          </p>
        </div>
        <button onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, "1"); }}
          className="text-amber-600 hover:text-amber-900 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      toast({ title: "Notificações ativadas! 🔔", description: "Você receberá updates do pedido." });
    } else if (status === "denied") {
      toast({ title: "Permissão negada", description: "Habilite no navegador pra receber updates.", variant: "destructive" });
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-3 flex items-center gap-3">
      <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
        <Bell className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">Receber notificações do pedido</p>
        <p className="text-xs text-blue-700">Saiba quando ficar pronto, sair pra entrega, etc.</p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={loading} className="shrink-0">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ativar"}
      </Button>
      <button
        onClick={() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, "1"); }}
        className="text-blue-400 hover:text-blue-700 shrink-0"
        aria-label="Dispensar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

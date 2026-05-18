// v1.0.0 — Gate de feature por plano
// Uso:
//   <UpgradeGate feature="tts">
//     <SecaoTTS />
//   </UpgradeGate>
// Mostra children se plano permite, senão mostra card de upgrade.
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlanFeatures, ExtraKey } from "@/hooks/usePlanFeatures";

interface UpgradeGateProps {
  feature: ExtraKey;
  children: ReactNode;
  // Texto opcional do que essa feature faz (pra cliente entender)
  featureName?: string;
  description?: string;
  // Variant compact: card menor, sem ícone grande (uso em listas)
  compact?: boolean;
}

const DEFAULT_LABELS: Record<ExtraKey, { name: string; description: string }> = {
  tts:            { name: "Resposta por Voz (TTS)", description: "Bot responde em áudio natural com vozes Chirp 3 HD" },
  distribuidoras: { name: "Módulo Distribuidoras",  description: "Orçamentos, pedidos de venda, controle de lotes/FIFO" },
  app_entregador: { name: "App do Entregador",      description: "PWA com mapa, drag-and-drop e GPS dos pedidos" },
  api_access:     { name: "Acesso à API",           description: "Endpoints REST para integrar com outros sistemas" },
  white_label:    { name: "White Label",            description: "Sua marca no painel, sem branding Ana Food" },
  multi_session:  { name: "Múltiplos Números",      description: "Conectar mais de um WhatsApp na mesma empresa" },
  heatmap:        { name: "Mapa de Calor",          description: "Concentração geográfica de pedidos por bairro" },
  analytics_pro:  { name: "Relatórios Avançados",   description: "DRE, fluxo de caixa, métricas profissionais" },
};

export function UpgradeGate({ feature, children, featureName, description, compact = false }: UpgradeGateProps) {
  const { hasExtra, isLoading } = usePlanFeatures();

  if (isLoading) return null; // evita flash do upgrade banner enquanto carrega
  if (hasExtra(feature)) return <>{children}</>;

  const label = featureName ?? DEFAULT_LABELS[feature]?.name ?? feature;
  const desc  = description ?? DEFAULT_LABELS[feature]?.description ?? "Disponível em planos superiores";

  if (compact) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center gap-3">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground truncate">{desc}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/billing">Upgrade</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="p-6 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold">{label}</h3>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Disponível em planos superiores ao seu atual.
        </p>
        <Button asChild>
          <Link to="/billing">Ver planos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// AgentControlBar.tsx — v2.0.0
// Barra de controle do agente IA no chat — com badge de auto-resume e countdown

import { useEffect, useState } from "react";
import { Bot, BotOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AgentControlBarProps {
  contactName: string;
  isPaused: boolean;
  isLoading?: boolean;
  onToggle: () => void;
  /** Timestamp ISO de quando operador enviou última mensagem (para countdown) */
  operatorLastMessageAt?: string | null;
  /** Minutos até auto-retomada */
  autoResumeMinutes?: number;
}

export function AgentControlBar({
  contactName,
  isPaused,
  isLoading,
  onToggle,
  operatorLastMessageAt,
  autoResumeMinutes = 15,
}: AgentControlBarProps) {
  // Countdown em minutos até auto-resume
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!isPaused || !operatorLastMessageAt) {
      setMinutesLeft(null);
      return;
    }

    const update = () => {
      const elapsed = (Date.now() - new Date(operatorLastMessageAt).getTime()) / 1000 / 60;
      const remaining = Math.max(0, autoResumeMinutes - elapsed);
      setMinutesLeft(Math.ceil(remaining));
    };

    update();
    const interval = setInterval(update, 30_000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, [isPaused, operatorLastMessageAt, autoResumeMinutes]);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {contactName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium truncate">{contactName}</span>

        {/* Badge auto-resume quando agente está pausado por intervenção humana */}
        {isPaused && minutesLeft !== null && minutesLeft > 0 && (
          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            Agente retoma em {minutesLeft}min
          </Badge>
        )}

        {/* Agente pausado sem auto-resume agendado */}
        {isPaused && minutesLeft === null && (
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
            Agente pausado
          </Badge>
        )}
      </div>

      <Button
        variant={isPaused ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        disabled={isLoading}
        className="shrink-0 gap-1.5"
      >
        {isPaused ? (
          <>
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Retomar Agente</span>
          </>
        ) : (
          <>
            <BotOff className="h-4 w-4" />
            <span className="hidden sm:inline">Pausar Agente</span>
          </>
        )}
      </Button>
    </div>
  );
}

import { Bot, BotOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentControlBarProps {
  contactName: string;
  isPaused: boolean;
  isLoading?: boolean;
  onToggle: () => void;
}

export function AgentControlBar({ contactName, isPaused, isLoading, onToggle }: AgentControlBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-medium text-primary">
            {contactName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="font-medium truncate">{contactName}</span>
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

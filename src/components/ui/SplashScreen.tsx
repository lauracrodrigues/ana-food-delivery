// src/components/ui/SplashScreen.tsx — v1.0.0
// Splash screen para carregamento de página — substitui spinners genéricos

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  /** Mensagem opcional abaixo do logo */
  message?: string;
  /** Se true, aplica fade-out antes de desmontar */
  visible?: boolean;
}

export function SplashScreen({ message = "Carregando...", visible = true }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(1);

  // Fade-out suave quando visible muda para false
  useEffect(() => {
    if (!visible) {
      setOpacity(0);
    } else {
      setOpacity(1);
    }
  }, [visible]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 pointer-events-none",
      )}
      style={{ opacity }}
      aria-label="Carregando"
      role="status"
    >
      {/* Logo / nome do app */}
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-2xl">A</span>
          </div>
          <span className="text-3xl font-bold tracking-tight text-foreground">
            Ana Food
          </span>
        </div>

        {/* Barra de progresso animada */}
        <div className="w-48 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-loading-bar" />
        </div>

        {/* Mensagem */}
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {message}
        </p>
      </div>
    </div>
  );
}

// Versão inline para usar dentro de cards/seções (não fullscreen)
export function InlineLoader({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// src/components/ui/SplashScreen.tsx — v2.0.0
// Splash screen profissional — aceita logo + nome empresa quando disponível
// Animação suave de entrada + saída + barra de progresso

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  /** Mensagem opcional abaixo do logo */
  message?: string;
  /** Se true, aplica fade-out antes de desmontar */
  visible?: boolean;
  /** URL do logo da empresa (sobrescreve marca Ana Food) */
  companyLogo?: string | null;
  /** Nome da empresa (sobrescreve "Ana Food") */
  companyName?: string | null;
}

export function SplashScreen({
  message = "Preparando o sistema...",
  visible = true,
  companyLogo = null,
  companyName = null,
}: SplashScreenProps) {
  const [opacity, setOpacity] = useState(1);
  const [mounted, setMounted] = useState(true);

  // Fade-out suave + desmonta depois pra não bloquear interação
  useEffect(() => {
    if (!visible) {
      setOpacity(0);
      const t = setTimeout(() => setMounted(false), 600);
      return () => clearTimeout(t);
    }
    setOpacity(1);
    setMounted(true);
  }, [visible]);

  if (!mounted) return null;

  const displayName = companyName || "Ana Food";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "A";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        visible ? "" : "pointer-events-none",
      )}
      style={{ opacity }}
      aria-label="Carregando"
      role="status"
    >
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo da empresa (se houver) OU marca Ana Food */}
        {companyLogo ? (
          <img
            src={companyLogo}
            alt={displayName}
            className="w-24 h-24 rounded-2xl object-cover shadow-2xl ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl ring-2 ring-primary/20">
              <span className="text-primary-foreground font-bold text-3xl">{initials}</span>
            </div>
          </div>
        )}

        {/* Nome */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayName}</h1>
          {companyLogo && companyName && (
            <p className="text-xs text-muted-foreground">via Ana Food</p>
          )}
        </div>

        {/* Barra de progresso animada */}
        <div className="w-56 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full animate-loading-bar" />
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

// Overlay semitransparente para cobrir conteúdo durante mutações ou transições longas.
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ visible, message, className }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background/70 backdrop-blur-[2px] rounded-inherit",
        "animate-in fade-in duration-150",
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

// v1.0.0 — Modal do mapa de calor (acesso rápido a partir da página Pedidos)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeatmapView } from "./HeatmapView";
import { Flame } from "lucide-react";

interface HeatmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HeatmapDialog({ open, onOpenChange }: HeatmapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Mapa de Calor
          </DialogTitle>
        </DialogHeader>
        {/* compact: sem stats cards grandes nem dicas — visualização rápida */}
        <HeatmapView compact mapHeight={450} />
      </DialogContent>
    </Dialog>
  );
}

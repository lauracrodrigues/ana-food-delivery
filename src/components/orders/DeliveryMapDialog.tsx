// v1.0.0 — Modal wrapper do mapa de entregadores
// Substitui o painel inline acima das colunas (visão consistente com HeatmapDialog)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeliveryMap } from "./DeliveryMap";
import { MotoIcon } from "@/components/ui/moto-icon";

interface DeliveryMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Callback do popup do marker → pai abre seleção de pedido
  onAssign?: (deliverer: { id: string; name: string }) => void;
}

export function DeliveryMapDialog({ open, onOpenChange, onAssign }: DeliveryMapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MotoIcon className="w-5 h-5 text-orange-500" />
            Entregadores ao vivo
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <DeliveryMap compact onAssign={onAssign} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

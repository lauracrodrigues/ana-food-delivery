import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { XCircle } from "lucide-react";
import { CANCELLATION_REASONS } from "./types";

interface CancelOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderNumber: string;
}

export function CancelOrderDialog({
  open,
  onClose,
  onConfirm,
  orderNumber,
}: CancelOrderDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      setSelectedReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Cancelar Pedido #{orderNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o motivo do cancelamento:
          </p>
          
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
            {CANCELLATION_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!selectedReason}
              className="flex-1"
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

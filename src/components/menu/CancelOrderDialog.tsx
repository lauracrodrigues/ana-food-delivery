// v1.0.0 — Modal de cancelamento com motivos pré-definidos (métrica)
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onCancelled: () => void;
}

// Lista de motivos pré-definidos (vira métrica pra empresa analisar churn)
const REASONS = [
  { id: "demorou",        label: "Demorou muito pra confirmar" },
  { id: "esqueci_item",   label: "Esqueci de adicionar/remover um item" },
  { id: "endereco_errado", label: "Endereço de entrega errado" },
  { id: "valor_alto",     label: "Valor ficou maior que esperado" },
  { id: "mudei_ideia",    label: "Mudei de ideia / não posso mais" },
  { id: "outro",          label: "Outro motivo" },
];

export function CancelOrderDialog({ open, onOpenChange, orderId, onCancelled }: CancelOrderDialogProps) {
  const { toast } = useToast();
  const [reasonId, setReasonId] = useState<string>("");
  const [extraNote, setExtraNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reasonId) {
      toast({ title: "Selecione um motivo", variant: "destructive" });
      return;
    }
    setLoading(true);
    const reasonLabel = REASONS.find(r => r.id === reasonId)?.label || reasonId;
    const fullReason = extraNote.trim()
      ? `${reasonLabel} — ${extraNote.trim()}`
      : reasonLabel;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancellation_reason: fullReason,
          cancelled_by: "customer",
          cancelled_at: new Date().toISOString(),
        } as any)
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Pedido cancelado",
        description: "Seu pedido foi cancelado. Se quiser, faça um novo!",
      });
      onCancelled();
      onOpenChange(false);
      setReasonId("");
      setExtraNote("");
    } catch (err: any) {
      toast({
        title: "Erro ao cancelar",
        description: err?.message || "Tente novamente ou entre em contato com a loja",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Cancelar pedido</DialogTitle>
          </div>
          <DialogDescription>
            Conta pra gente o motivo — assim a loja pode melhorar o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <RadioGroup value={reasonId} onValueChange={setReasonId}>
            {REASONS.map(r => (
              <div key={r.id} className="flex items-start space-x-2">
                <RadioGroupItem value={r.id} id={r.id} className="mt-1" />
                <Label htmlFor={r.id} className="text-sm font-normal cursor-pointer leading-relaxed">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Campo opcional pra detalhar */}
          {reasonId && (
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs">Quer detalhar? (opcional)</Label>
              <Textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="Conte mais sobre o motivo..."
                rows={2}
                maxLength={200}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="flex-1">
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reasonId}
            className="flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Cancelar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

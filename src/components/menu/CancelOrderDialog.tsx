// v1.1.0 — Cancel em qualquer status ativo + aviso pra cancel tardio (preparing+)
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
  /** Status atual do pedido — usado pra mostrar aviso quando cancel é tardio (preparing+) */
  currentStatus?: string;
  /** Chamado após cancelamento com sucesso — passe função que volta pra tela inicial / recarrega */
  onCancelled: () => void;
}

// Status onde cancelar gera perda pra loja (já houve produção/insumos consumidos)
const LATE_CANCEL_STATUSES = ["preparing", "ready", "delivering"];

// Lista de motivos pré-definidos (vira métrica pra empresa analisar churn)
const REASONS = [
  { id: "demorou",        label: "Demorou muito pra confirmar" },
  { id: "esqueci_item",   label: "Esqueci de adicionar/remover um item" },
  { id: "endereco_errado", label: "Endereço de entrega errado" },
  { id: "valor_alto",     label: "Valor ficou maior que esperado" },
  { id: "mudei_ideia",    label: "Mudei de ideia / não posso mais" },
  { id: "outro",          label: "Outro motivo" },
];

export function CancelOrderDialog({ open, onOpenChange, orderId, currentStatus, onCancelled }: CancelOrderDialogProps) {
  const { toast } = useToast();
  const [reasonId, setReasonId] = useState<string>("");
  const [extraNote, setExtraNote] = useState("");
  const [loading, setLoading] = useState(false);
  // v1.1.0 — flag de cancelamento tardio (pedido já em produção/entrega)
  const isLateCancel = LATE_CANCEL_STATUSES.includes(currentStatus ?? "");

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
      // v1.1.0 — RPC aceita qualquer status ativo (só bloqueia finalizados)
      const { data, error } = await supabase.rpc("cancel_order_by_customer", {
        p_order_id: orderId,
        p_reason: fullReason,
      });

      if (error) throw error;

      const result = data as { ok?: boolean; error?: string; message?: string; current_status?: string; late_cancel?: boolean } | null;
      if (!result?.ok) {
        // Pedido já finalizado (delivered/completed/archived) ou não encontrado
        const msg = result?.message
          || (result?.error === 'already_finalized' ? 'Pedido já foi finalizado e não pode mais ser cancelado' : null)
          || (result?.error === 'order_not_found' ? 'Pedido não encontrado' : null)
          || 'Não foi possível cancelar';
        toast({ title: "Não foi possível cancelar", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Mensagem diferenciada quando cancel é tardio — loja vai entrar em contato
      const successDesc = result.late_cancel
        ? "Pedido cancelado. A loja foi notificada e pode entrar em contato com você."
        : "Seu pedido foi cancelado. Se quiser, faça um novo!";

      toast({
        title: "Pedido cancelado",
        description: successDesc,
      });
      onCancelled();
      onOpenChange(false);
      setReasonId("");
      setExtraNote("");
    } catch (err: any) {
      console.error('[CancelOrder] erro:', err);
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

        {/* v1.1.0 — Aviso pra cancel tardio (pedido já em produção/entrega) */}
        {isLateCancel && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Seu pedido <strong>já está em preparo ou a caminho</strong>. Você ainda pode cancelar,
              mas a loja pode entrar em contato pra confirmar — produção/insumos podem ter sido usados.
            </p>
          </div>
        )}

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

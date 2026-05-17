// v1.0.0 — Botão "chamar garçom" no cardápio quando cliente está em mesa (?mesa=X)
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, CheckCircle2, Droplet, Receipt, HelpCircle, MoreHorizontal } from "lucide-react";

interface CallWaiterButtonProps {
  companyId: string;
  tableNumber: string;
}

const REASONS = [
  { id: "help",  label: "Ajuda",    icon: HelpCircle },
  { id: "bill",  label: "Conta",    icon: Receipt },
  { id: "water", label: "Água",     icon: Droplet },
  { id: "other", label: "Outro",    icon: MoreHorizontal },
] as const;

export function CallWaiterButton({ companyId, tableNumber }: CallWaiterButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCall = async (reason: string) => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("call_waiter" as any, {
      p_company_id: companyId,
      p_table_number: tableNumber,
      p_reason: reason,
    });
    setSubmitting(false);

    if (error || !data || !(data as any).success) {
      toast({
        title: "Não foi possível chamar",
        description: (data as any)?.error || error?.message || "Tente de novo",
        variant: "destructive",
      });
      return;
    }
    setSuccess(true);
    setTimeout(() => { setOpen(false); setSuccess(false); }, 2000);
  };

  return (
    <>
      {/* Botão flutuante visível no cardápio (canto inferior direito) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg p-3 flex items-center gap-2 text-sm font-semibold transition-transform hover:scale-105"
        aria-label="Chamar garçom"
      >
        <Bell className="h-5 w-5" />
        Garçom
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chamar garçom — Mesa {tableNumber}</DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="font-semibold">Garçom chamado!</p>
              <p className="text-sm text-muted-foreground">Em instantes alguém vai te atender</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Qual o motivo?</p>
              <div className="grid grid-cols-2 gap-2 py-2">
                {REASONS.map((r) => {
                  const Icon = r.icon;
                  return (
                    <Button
                      key={r.id}
                      variant="outline"
                      onClick={() => handleCall(r.id)}
                      disabled={submitting}
                      className="h-20 flex flex-col gap-1.5"
                    >
                      <Icon className="h-6 w-6" />
                      <span>{r.label}</span>
                    </Button>
                  );
                })}
              </div>
              {submitting && (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

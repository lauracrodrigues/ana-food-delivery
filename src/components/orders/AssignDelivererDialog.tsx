// v1.0.0 — modal de seleção de entregador ao avançar pedido para Em Entrega
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order } from "./types";
import { MapPin, User } from "lucide-react";
import { MotoIcon } from "@/components/ui/moto-icon";

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

interface AssignDelivererDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  // Confirma com entregador selecionado — pai atualiza status + envia WA
  onConfirm: (order: Order, deliverer: Deliverer) => void;
}

export function AssignDelivererDialog({ order, open, onClose, onConfirm }: AssignDelivererDialogProps) {
  const { companyId } = useCompanyId();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: deliverers = [], isLoading } = useQuery({
    queryKey: ["deliverers", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("deliverers")
        .select("id, name, phone, active")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Deliverer[];
    },
    enabled: !!companyId && open,
  });

  const handleConfirm = () => {
    if (!order || !selectedId) return;
    const deliverer = deliverers.find(d => d.id === selectedId);
    if (!deliverer) return;
    onConfirm(order, deliverer);
    setSelectedId(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  // Endereço resumido do pedido para exibição no modal
  const addressLine = [
    order?.address && order?.address_number
      ? `${order.address}, ${order.address_number}`
      : order?.address,
    order?.neighborhood,
    order?.city,
  ].filter(Boolean).join(" · ");

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MotoIcon className="w-5 h-5 text-purple-500" />
            Selecionar Entregador
          </DialogTitle>
        </DialogHeader>

        {/* Resumo do pedido */}
        {order && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <span>#{order.order_number}</span>
              <span className="text-muted-foreground">—</span>
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{order.customer_name}</span>
            </div>
            {addressLine && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="text-xs">{addressLine}</span>
              </div>
            )}
          </div>
        )}

        {/* Lista de entregadores */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : deliverers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MotoIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum entregador ativo.</p>
              <p className="text-xs mt-1">Cadastre em <strong>Cadastros → Entregadores</strong>.</p>
            </div>
          ) : (
            deliverers.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  selectedId === d.id
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                    : "border-border hover:border-purple-300 hover:bg-muted/50"
                }`}
              >
                {/* Avatar inicial */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  selectedId === d.id
                    ? "bg-purple-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.phone}</p>
                </div>
                {selectedId === d.id && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Confirmar e Enviar para Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

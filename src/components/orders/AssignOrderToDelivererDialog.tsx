// v1.0.0 — Inverso do AssignDelivererDialog
// Fluxo: clica entregador no mapa → lista pedidos "pronto" (sem entregador) → escolhe → atribui
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Order } from "./types";
import { MapPin, Package } from "lucide-react";
import { MotoIcon } from "@/components/ui/moto-icon";
import { formatCurrency } from "@/lib/currency-formatter";

interface AssignOrderToDelivererDialogProps {
  deliverer: { id: string; name: string } | null;
  open: boolean;
  onClose: () => void;
  // Reaproveita o mesmo handler do AssignDelivererDialog
  onConfirm: (order: Order, deliverer: { id: string; name: string; phone: string }) => void;
}

export function AssignOrderToDelivererDialog({ deliverer, open, onClose, onConfirm }: AssignOrderToDelivererDialogProps) {
  const { companyId } = useCompanyId();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Lista pedidos prontos sem entregador atribuído
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["ready-orders-no-deliverer", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "ready")
        .is("deliverer_id", null)
        .order("created_at", { ascending: true });
      return (data || []) as Order[];
    },
    enabled: !!companyId && open,
  });

  // Telefone completo do entregador (necessário para WA — não vem do mapa)
  const { data: delivererFull } = useQuery({
    queryKey: ["deliverer-detail", deliverer?.id],
    queryFn: async () => {
      if (!deliverer?.id) return null;
      const { data } = await supabase
        .from("deliverers")
        .select("phone")
        .eq("id", deliverer.id)
        .single();
      return data as { phone: string } | null;
    },
    enabled: !!deliverer?.id && open,
  });

  const handleConfirm = () => {
    if (!deliverer || !selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;
    onConfirm(order, {
      id: deliverer.id,
      name: deliverer.name,
      phone: delivererFull?.phone || "",
    });
    setSelectedOrderId(null);
    onClose();
  };

  const handleClose = () => {
    setSelectedOrderId(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MotoIcon className="w-5 h-5 text-orange-500" />
            Atribuir pedido a {deliverer?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : orders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pedido pronto sem entregador.</p>
              <p className="text-xs mt-1">Pedidos já em entrega não aparecem aqui.</p>
            </div>
          ) : (
            orders.map(o => {
              const addressLine = [
                o.address && o.address_number ? `${o.address}, ${o.address_number}` : o.address,
                o.neighborhood, o.city,
              ].filter(Boolean).join(" · ");
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedOrderId === o.id
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                      : "border-border hover:border-orange-300 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      #{o.order_number} — {o.customer_name}
                    </span>
                    <span className="text-sm font-bold text-orange-600">{formatCurrency(o.total || 0)}</span>
                  </div>
                  {addressLine && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{addressLine}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedOrderId}>
            Confirmar atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Phone, MapPin, XCircle, Clock, Package, Truck } from "lucide-react";
import { Order } from "./types";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onPrint: (order: Order, isReprint: boolean) => void;
  onCancel: () => void;
  onOpenWhatsApp: (phone: string, orderNumber: string) => void;
  isPrinting: boolean;
}

export function OrderDetailsDialog({
  order,
  open,
  onClose,
  onPrint,
  onCancel,
  onOpenWhatsApp,
  isPrinting,
}: OrderDetailsDialogProps) {
  if (!order) return null;

  const total = order.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0) || 0;
  const totalWithDelivery = total + (order.delivery_fee || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Pedido #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Info */}
          <div className="flex items-center gap-2">
            {order.type === "delivery" ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm">
                <Truck className="w-4 h-4" />
                Entrega
              </div>
            ) : (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-sm">
                <Package className="w-4 h-4" />
                Retirada
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2">Cliente</h3>
            <p className="text-sm">{order.customer_name}</p>
            {order.customer_phone && (
              <button
                onClick={() => onOpenWhatsApp(order.customer_phone, order.order_number)}
                className="flex items-center gap-1 text-sm text-green-600 hover:underline mt-1"
              >
                <Phone className="w-4 h-4" />
                {order.customer_phone}
              </button>
            )}
            {order.address && (
              <div className="flex gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{order.address}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-2">Itens do Pedido</h3>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.quantity}x {item.name}</p>
                    {item.observations && (
                      <p className="text-xs text-muted-foreground italic">Obs: {item.observations}</p>
                    )}
                  </div>
                  <p className="font-medium">
                    R$ {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            {order.delivery_fee && order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de entrega:</span>
                <span>R$ {order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>R$ {totalWithDelivery.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pagamento:</span>
              <span className="capitalize">{order.payment_method}</span>
            </div>
          </div>

          {order.observations && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-1">Observações</h3>
                <p className="text-sm text-muted-foreground italic">{order.observations}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {order.status !== "cancelled" && order.status !== "completed" && (
              <Button
                variant="destructive"
                onClick={onCancel}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancelar Pedido
              </Button>
            )}
            
            {order.status !== "pending" && order.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={() => onPrint(order, true)}
                disabled={isPrinting}
                className="flex-1"
              >
                <Printer className="w-4 h-4 mr-2" />
                {isPrinting ? "Imprimindo..." : "Reimprimir"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Truck, MessageSquare, Download, Power, PauseCircle } from "lucide-react";

interface QuickActionsProps {
  storeOpen: boolean;
  deliveryActive: boolean;
  onToggleStore: () => void;
  onToggleDelivery: () => void;
  onSendBroadcast: () => void;
  onBackup: () => void;
}

export function QuickActions({
  storeOpen,
  deliveryActive,
  onToggleStore,
  onToggleDelivery,
  onSendBroadcast,
  onBackup,
}: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant={storeOpen ? "default" : "outline"}
          className="w-full justify-start"
          onClick={onToggleStore}
        >
          {storeOpen ? (
            <>
              <Store className="mr-2 h-4 w-4" />
              Loja Aberta
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              Loja Fechada
            </>
          )}
        </Button>

        <Button
          variant={deliveryActive ? "default" : "outline"}
          className="w-full justify-start"
          onClick={onToggleDelivery}
        >
          {deliveryActive ? (
            <>
              <Truck className="mr-2 h-4 w-4" />
              Delivery Ativo
            </>
          ) : (
            <>
              <PauseCircle className="mr-2 h-4 w-4" />
              Delivery Pausado
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onSendBroadcast}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Enviar Mensagem
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onBackup}
        >
          <Download className="mr-2 h-4 w-4" />
          Backup de Dados
        </Button>
      </CardContent>
    </Card>
  );
}
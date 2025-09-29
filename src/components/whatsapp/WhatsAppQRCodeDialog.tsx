import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";

interface WhatsAppQRCodeDialogProps {
  open: boolean;
  qrCode: string;
  sessionName: string;
  onClose: () => void;
  onRefresh: (sessionName: string) => void;
}

export function WhatsAppQRCodeDialog({
  open,
  qrCode,
  sessionName,
  onClose,
  onRefresh,
}: WhatsAppQRCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code abaixo com o WhatsApp da sessão: {sessionName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6">
          {qrCode && (
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              className="w-64 h-64 border-2 border-border rounded-lg"
            />
          )}
          <p className="text-sm text-muted-foreground mt-4 text-center">
            O QR Code expira em alguns minutos. Se necessário, clique em "Gerar Novo QR Code".
          </p>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => onRefresh(sessionName)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar Novo QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
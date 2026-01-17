import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, LogOut, Printer, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CashRegisterSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashRegisterSuccessDialog({ 
  open, 
  onOpenChange 
}: CashRegisterSuccessDialogProps) {
  const navigate = useNavigate();

  const handleExit = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleView = () => {
    onOpenChange(false);
    navigate('/caixa/historico');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Caixa Fechado com Sucesso!</h2>
          <p className="text-muted-foreground mb-8">O que deseja fazer agora?</p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleExit}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button 
              className="flex-1"
              onClick={handleView}
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

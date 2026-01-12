import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWaiters } from '@/hooks/pdv/useWaiters';
import { useChecks } from '@/hooks/pdv/useChecks';
import { usePOSStore } from '@/stores/posStore';
import { TableWithStatus } from '@/types/pdv';
import { Loader2, Users, Receipt, User } from 'lucide-react';

interface OpenCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableWithStatus | null;
  onSuccess: (checkId: string) => void;
}

export function OpenCheckDialog({ open, onOpenChange, table, onSuccess }: OpenCheckDialogProps) {
  const { waiters, isLoading: isLoadingWaiters } = useWaiters();
  const { createCheck, isCreating } = useChecks();
  const { setContext } = usePOSStore();

  const [identification, setIdentification] = useState('');
  const [waiterId, setWaiterId] = useState<string>('');
  const [guestCount, setGuestCount] = useState(1);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setIdentification('');
      setWaiterId('');
      setGuestCount(1);
    }
  }, [open]);

  const handleOpenCheck = async () => {
    if (!table) return;

    try {
      const selectedWaiter = waiters.find(w => w.id === waiterId);
      
      const check = await createCheck({
        table_id: table.id,
        waiter_id: waiterId || undefined,
        waiter_name: selectedWaiter?.name,
        guest_count: guestCount,
        notes: identification || undefined,
      });

      // Set context for POS
      setContext({
        type: 'table',
        table_id: table.id,
        table_number: parseInt(String(table.table_number)) || 0,
        check_id: check.id,
        check_number: check.check_number,
        waiter_id: waiterId || undefined,
        waiter_name: selectedWaiter?.name,
      });

      onOpenChange(false);
      onSuccess(check.id);
    } catch (error) {
      console.error('Error opening check:', error);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Abrir Comanda - Mesa {table?.table_number || table?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Identification (optional) */}
          <div className="space-y-2">
            <Label htmlFor="identification">Identificação (opcional)</Label>
            <Input
              id="identification"
              placeholder="Nome do cliente ou referência"
              value={identification}
              onChange={(e) => setIdentification(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenCheck()}
            />
            <p className="text-xs text-muted-foreground">
              Se não informado, a comanda será identificada pelo número.
            </p>
          </div>

          {/* Waiter Select */}
          <div className="space-y-2">
            <Label htmlFor="waiter">Garçom</Label>
            <Select value={waiterId} onValueChange={setWaiterId}>
              <SelectTrigger id="waiter">
                <SelectValue placeholder="Selecione o garçom">
                  {isLoadingWaiters && <Loader2 className="w-4 h-4 animate-spin" />}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {waiters.map((waiter) => (
                  <SelectItem key={waiter.id} value={waiter.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {waiter.name}
                    </div>
                  </SelectItem>
                ))}
                {waiters.length === 0 && !isLoadingWaiters && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum garçom cadastrado
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Guest Count */}
          <div className="space-y-2">
            <Label>Quantidade de Pessoas</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                disabled={guestCount <= 1}
              >
                -
              </Button>
              <div className="flex items-center gap-2 min-w-[80px] justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-lg font-semibold">{guestCount}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setGuestCount(guestCount + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Voltar
          </Button>
          <Button onClick={handleOpenCheck} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Abrindo...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Abrir Comanda
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

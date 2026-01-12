import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePOSStore } from '@/stores/posStore';
import { formatCurrency } from '@/lib/currency-formatter';
import { Clock, Users, User, Receipt, MapPin, Minus, Plus } from 'lucide-react';

interface CheckInfoHeaderProps {
  openedAt?: string;
  onGuestCountChange?: (count: number) => void;
}

export function CheckInfoHeader({ openedAt, onGuestCountChange }: CheckInfoHeaderProps) {
  const { context, subtotal, service_amount, service_percent } = usePOSStore();
  const [elapsedTime, setElapsedTime] = useState('0h0m');
  const [guestCount, setGuestCount] = useState(1);

  // Update elapsed time every minute
  useEffect(() => {
    if (!openedAt) {
      setElapsedTime('0h0m');
      return;
    }

    const updateTime = () => {
      const start = new Date(openedAt).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      setElapsedTime(`${hours}h${mins}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [openedAt]);

  const handleGuestChange = (delta: number) => {
    const newCount = Math.max(1, guestCount + delta);
    setGuestCount(newCount);
    onGuestCountChange?.(newCount);
  };

  const identification = context.customer_name || (context.check_number ? `#${context.check_number}` : '');

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
      {/* Identification */}
      {identification && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm font-medium">
            Ident: {identification}
          </Badge>
        </div>
      )}

      {/* Check, Table, Waiter info */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {context.check_number && (
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Comanda:</span>
            <span className="font-medium">{context.check_number}</span>
          </div>
        )}

        {context.table_number && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Mesa:</span>
            <span className="font-medium">{context.table_number}</span>
          </div>
        )}

        {context.waiter_name && (
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Garçom:</span>
            <span className="font-medium">{context.waiter_name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Tempo:</span>
          <span className="font-medium">{elapsedTime}</span>
        </div>
      </div>

      {/* Guest count with buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Qtd de pessoas:</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleGuestChange(-1)}
            disabled={guestCount <= 1}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-6 text-center font-medium">{guestCount}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleGuestChange(1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(subtotal + service_amount)}</span>
        </div>
        {service_percent > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Serviço ({service_percent.toFixed(2)}%)</span>
            <span>{formatCurrency(service_amount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

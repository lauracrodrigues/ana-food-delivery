import { useState } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Banknote,
  QrCode,
  CreditCard,
  X,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { usePaymentMethods, PaymentMethod } from '@/hooks/pdv/usePaymentMethods';
import { useChecks } from '@/hooks/pdv/useChecks';
import { usePOSStore } from '@/stores/posStore';
import { useCashRegister } from '@/hooks/pdv/useCashRegister';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentEntry {
  id: string;
  payment_method_id: string;
  payment_method_name: string;
  payment_method_type: string | null;
  amount: number;
  received_amount?: number;
  change_amount?: number;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
}

const getPaymentIcon = (type: string | null) => {
  switch (type) {
    case 'cash':
      return Banknote;
    case 'pix':
      return QrCode;
    case 'credit':
    case 'debit':
      return CreditCard;
    default:
      return Banknote;
  }
};

const getPaymentLabel = (type: string | null) => {
  switch (type) {
    case 'cash':
      return 'Dinheiro';
    case 'pix':
      return 'PIX';
    case 'credit':
      return 'Crédito';
    case 'debit':
      return 'Débito';
    default:
      return 'Outro';
  }
};

export function PaymentDialog({ open, onOpenChange, total }: PaymentDialogProps) {
  const { toast } = useToast();
  const { paymentMethods, isLoading: isLoadingMethods } = usePaymentMethods();
  const { createCheck, isCreating } = useChecks();
  const { activeRegister } = useCashRegister();
  const clearCart = usePOSStore(state => state.clearCart);

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const canFinalize = remaining === 0 && payments.length > 0;

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setInputAmount(remaining.toFixed(2).replace('.', ','));
    setReceivedAmount('');
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleAddPayment = () => {
    if (!selectedMethod) return;

    const amount = parseAmount(inputAmount);
    if (amount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'O valor do pagamento deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (amount > remaining) {
      toast({
        title: 'Valor excede o restante',
        description: `O valor máximo permitido é ${formatCurrency(remaining)}.`,
        variant: 'destructive',
      });
      return;
    }

    const isCash = selectedMethod.type === 'cash';
    const received = isCash ? parseAmount(receivedAmount) : amount;
    
    if (isCash && received < amount) {
      toast({
        title: 'Valor recebido insuficiente',
        description: 'O valor recebido deve ser igual ou maior que o valor do pagamento.',
        variant: 'destructive',
      });
      return;
    }

    const newPayment: PaymentEntry = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payment_method_id: selectedMethod.id,
      payment_method_name: selectedMethod.name,
      payment_method_type: selectedMethod.type,
      amount,
      received_amount: isCash ? received : undefined,
      change_amount: isCash ? received - amount : undefined,
    };

    setPayments([...payments, newPayment]);
    setSelectedMethod(null);
    setInputAmount('');
    setReceivedAmount('');
  };

  const handleRemovePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.id !== paymentId));
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;

    setIsProcessing(true);
    try {
      // 1. Create check
      const check = await createCheck({});

      // 2. Add items (uses mutate, not async)
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get cart from store
      const { cart, subtotal, service_amount, service_percent, discount_amount, couvert_amount, delivery_fee, total } = usePOSStore.getState();

      // Insert items
      const items = cart.map(item => ({
        check_id: check.id,
        company_id: check.company_id,
        created_by: user.user!.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price: item.unit_price,
        quantity: item.quantity,
        extras: JSON.parse(JSON.stringify(item.extras)),
        extras_total: item.extras_total,
        notes: item.notes,
        promotion_id: item.promotion_id,
        discount_amount: item.discount_amount,
        total_price: item.total_price,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('check_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // 3. Update check totals
      const { error: totalsError } = await supabase
        .from('checks')
        .update({
          subtotal,
          service_percent,
          service_amount,
          discount_amount,
          couvert_amount,
          delivery_fee,
          total_amount: total,
        })
        .eq('id', check.id);

      if (totalsError) throw totalsError;

      // 4. Add payments
      const paymentRecords = payments.map((p) => ({
        check_id: check.id,
        company_id: check.company_id,
        cash_register_id: activeRegister?.id,
        payment_method_id: p.payment_method_id,
        payment_method_name: p.payment_method_name,
        payment_method_type: p.payment_method_type,
        amount: p.amount,
        received_amount: p.received_amount,
        change_amount: p.change_amount,
        processed_by: user.user!.id,
        status: 'completed',
      }));

      const { error: paymentError } = await supabase
        .from('check_payments')
        .insert(paymentRecords);

      if (paymentError) throw paymentError;

      // 5. Update paid amount and close check
      const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const { error: closeError } = await supabase
        .from('checks')
        .update({ 
          paid_amount: totalPaidAmount,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.user?.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', check.id);

      if (closeError) throw closeError;

      // 6. Clear and close
      clearCart();
      onOpenChange(false);
      setPayments([]);

      toast({
        title: 'Venda finalizada',
        description: `Comanda #${check.check_number} fechada com sucesso.`,
      });
    } catch (error) {
      console.error('Error finalizing payment:', error);
      toast({
        title: 'Erro ao finalizar',
        description: 'Não foi possível processar o pagamento.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setPayments([]);
      setSelectedMethod(null);
      setInputAmount('');
      setReceivedAmount('');
      onOpenChange(false);
    }
  };

  const changeAmount = selectedMethod?.type === 'cash' 
    ? parseAmount(receivedAmount) - parseAmount(inputAmount) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total da Conta</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Já Pago</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Restante</span>
              <span className={cn(remaining === 0 ? 'text-green-600' : 'text-primary')}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Added Payments */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pagamentos Adicionados</Label>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {payments.map((payment) => {
                    const Icon = getPaymentIcon(payment.payment_method_type);
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{payment.payment_method_name}</span>
                          {payment.change_amount && payment.change_amount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Troco: {formatCurrency(payment.change_amount)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemovePayment(payment.id)}
                            disabled={isProcessing}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Add Payment Section */}
          {remaining > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Adicionar Pagamento</Label>
              
              {/* Payment Method Buttons */}
              {!selectedMethod && (
                <div className="grid grid-cols-4 gap-2">
                  {isLoadingMethods ? (
                    <div className="col-span-4 flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    paymentMethods.map((method) => {
                      const Icon = getPaymentIcon(method.type);
                      return (
                        <Button
                          key={method.id}
                          variant="outline"
                          className="flex flex-col h-auto py-3 gap-1"
                          onClick={() => handleSelectMethod(method)}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs">{method.name}</span>
                        </Button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Amount Input */}
              {selectedMethod && (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = getPaymentIcon(selectedMethod.type);
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="font-medium">{selectedMethod.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMethod(null)}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      value={inputAmount}
                      onChange={(e) => setInputAmount(e.target.value)}
                      placeholder="0,00"
                      className="text-right text-lg font-mono"
                    />
                  </div>

                  {selectedMethod.type === 'cash' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="received">Valor Recebido</Label>
                        <Input
                          id="received"
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value)}
                          placeholder="0,00"
                          className="text-right text-lg font-mono"
                        />
                      </div>

                      {changeAmount > 0 && (
                        <div className="flex justify-between p-2 rounded bg-green-100 dark:bg-green-900/20">
                          <span className="text-sm font-medium">Troco</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(changeAmount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <Button onClick={handleAddPayment} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pagamento
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {canFinalize && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Pagamento completo!</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleFinalize} disabled={!canFinalize || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Finalizar Venda'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

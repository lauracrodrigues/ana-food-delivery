// v2.2.0 — PaymentDialog: finalize_check RPC transacional + rollback best-effort
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Percent,
  DollarSign,
  ChevronDown,
  User,
  Search,
} from 'lucide-react';
import { getPaymentIcon, getPaymentLabel } from '@/lib/status-helpers';
import { formatCurrency } from '@/lib/currency-formatter';
import { usePaymentMethods, PaymentMethod } from '@/hooks/pdv/usePaymentMethods';
import { useChecks } from '@/hooks/pdv/useChecks';
import { usePOSStore } from '@/stores/posStore';
import { useCashRegister } from '@/hooks/pdv/useCashRegister';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

// Atalhos padrão de troco para pagamento em dinheiro
const DEFAULT_CASH_SHORTCUTS = [5, 10, 20, 50, 100];

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  credit_balance: number;
}

interface PaymentEntry {
  id: string;
  payment_method_id: string;
  payment_method_name: string;
  payment_method_type: string | null;
  amount: number;
  received_amount?: number;
  change_amount?: number;
  // campos para Prazo e Crédito do Cliente
  customer_id?: string;
  customer_name?: string;
  is_credit_debit?: boolean; // true = abate saldo, false = gera AR (Prazo)
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
}

// getPaymentIcon, getPaymentLabel → importados de @/lib/status-helpers

export function PaymentDialog({ open, onOpenChange, total: originalTotal }: PaymentDialogProps) {
  const { toast } = useToast();
  const { paymentMethods, isLoading: isLoadingMethods } = usePaymentMethods();
  const { createCheck, isCreating } = useChecks();
  const { activeRegister } = useCashRegister();
  const { settings } = usePDVSettings();
  const { companyId } = useCompanyId();
  const {
    clearCart,
    context,
    service_percent: storeServicePercent,
    setService,
    setDiscount,
    subtotal,
  } = usePOSStore();

  // Atalhos de troco: usa settings do banco se disponível, senão defaults
  const cashShortcuts: number[] = Array.isArray(settings?.cash_shortcuts)
    ? (settings.cash_shortcuts as number[])
    : DEFAULT_CASH_SHORTCUTS;

  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Discount/Markup state
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [isMarkup, setIsMarkup] = useState(false);

  // Service charge (mesa)
  const [serviceEnabled, setServiceEnabled] = useState(context.type === 'table');
  const [servicePercent, setServicePercent] = useState(storeServicePercent || 10);

  // Cliente selecionado para Prazo / Crédito do Cliente
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null); // método esperando cliente

  // Refs para auto-focus
  const amountInputRef = useRef<HTMLInputElement>(null);
  const receivedInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  // Busca clientes para seleção no Prazo/Crédito
  const { data: customerResults = [] } = useQuery<CustomerOption[]>({
    queryKey: ['pdv-customer-search', companyId, customerQuery],
    queryFn: async () => {
      if (!companyId || customerQuery.trim().length < 2) return [];
      const { data } = await supabase.from('customers')
        .select('id,name,phone,credit_balance')
        .eq('company_id', companyId)
        .or(`name.ilike.%${customerQuery}%,phone.ilike.%${customerQuery}%`)
        .limit(8);
      return (data || []) as CustomerOption[];
    },
    enabled: !!companyId && customerQuery.trim().length >= 2,
  });

  // Cálculo de totais
  const discountAmount = discountType === 'percent'
    ? subtotal * (parseFloat(discountValue) || 0) / 100
    : parseFloat(discountValue.replace(',', '.')) || 0;

  const adjustedSubtotal = isMarkup
    ? subtotal + discountAmount
    : subtotal - discountAmount;

  const serviceAmount = serviceEnabled
    ? adjustedSubtotal * (servicePercent / 100)
    : 0;

  const adjustedTotal = Math.max(0, adjustedSubtotal + serviceAmount);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, adjustedTotal - totalPaid);
  const canFinalize = remaining === 0 && payments.length > 0;

  useEffect(() => {
    if (selectedMethod && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [selectedMethod]);

  useEffect(() => {
    if (customerSearchOpen && customerSearchRef.current) {
      setTimeout(() => customerSearchRef.current?.focus(), 100);
    }
  }, [customerSearchOpen]);

  useEffect(() => {
    if (open) {
      setDiscount(isMarkup ? -discountAmount : discountAmount, discountType === 'percent' ? parseFloat(discountValue) || 0 : 0);
      setService(serviceEnabled ? servicePercent : 0);
    }
  }, [discountAmount, discountValue, discountType, isMarkup, serviceEnabled, servicePercent, open]);

  const handleSelectMethod = (method: PaymentMethod) => {
    if (method.type === 'credit_customer') {
      // Prazo ou Crédito → precisa selecionar cliente primeiro
      setPendingMethod(method);
      setCustomerSearchOpen(true);
      return;
    }
    setSelectedMethod(method);
    setInputAmount(remaining.toFixed(2).replace('.', ','));
    setReceivedAmount('');
  };

  // Confirma cliente selecionado para método Prazo/Crédito
  const handleConfirmCustomer = (customer: CustomerOption) => {
    setCustomerSearchOpen(false);
    setCustomerQuery('');
    setSelectedCustomer(customer);
    if (!pendingMethod) return;

    setSelectedMethod(pendingMethod);
    const isCredit = pendingMethod.name.toLowerCase().includes('crédit');
    // Crédito do Cliente: limita ao saldo disponível
    const maxAmount = isCredit
      ? Math.min(remaining, customer.credit_balance)
      : remaining;
    setInputAmount(maxAmount.toFixed(2).replace('.', ','));
    setReceivedAmount('');
    setPendingMethod(null);
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleAddPayment = () => {
    if (!selectedMethod) return;

    let amount = parseAmount(inputAmount);
    if (amount <= 0) {
      toast({ title: 'Valor inválido', description: 'O valor deve ser maior que zero.', variant: 'destructive' });
      return;
    }
    if (amount > remaining) amount = remaining;
    if (remaining <= 0) {
      toast({ title: 'Conta já paga', description: 'O valor total já foi coberto.' });
      return;
    }

    // Validação Prazo/Crédito — precisa ter cliente
    if (selectedMethod.type === 'credit_customer' && !selectedCustomer) {
      toast({ title: 'Selecione o cliente', variant: 'destructive' });
      return;
    }

    // Crédito do Cliente: valida saldo
    const isCredit = selectedMethod.type === 'credit_customer' &&
      selectedMethod.name.toLowerCase().includes('crédit');
    if (isCredit && selectedCustomer && amount > selectedCustomer.credit_balance) {
      toast({ title: 'Saldo insuficiente', description: `Saldo: ${formatCurrency(selectedCustomer.credit_balance)}`, variant: 'destructive' });
      return;
    }

    const isCash = selectedMethod.type === 'cash';
    const receivedValue = parseAmount(receivedAmount);
    const received = isCash && receivedValue > 0 ? receivedValue : amount;
    const change = isCash && receivedValue > amount ? receivedValue - amount : 0;

    const newPayment: PaymentEntry = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payment_method_id: selectedMethod.id,
      payment_method_name: selectedMethod.name,
      payment_method_type: selectedMethod.type,
      amount,
      received_amount: isCash ? received : undefined,
      change_amount: isCash ? change : undefined,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.name,
      is_credit_debit: isCredit,
    };

    setPayments([...payments, newPayment]);
    setSelectedMethod(null);
    setSelectedCustomer(null);
    setInputAmount('');
    setReceivedAmount('');
  };

  const handleRemovePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.id !== paymentId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedMethod) handleAddPayment();
    }
    if (!selectedMethod && e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (paymentMethods[index]) handleSelectMethod(paymentMethods[index]);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;

    setIsProcessing(true);
    let checkId: string | null = null;

    try {
      const check = await createCheck({});
      checkId = check.id; // salva para rollback se necessário

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { cart } = usePOSStore.getState();

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

      const totalPaidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

      // Tenta usar RPC atômica; se não existir ainda, cai no fluxo legado
      const { error: rpcError } = await supabase.rpc('finalize_check', {
        p_check_id:        check.id,
        p_items:           items,
        p_payments:        paymentRecords,
        p_subtotal:        adjustedSubtotal,
        p_service_percent: serviceEnabled ? servicePercent : 0,
        p_service_amount:  serviceAmount,
        p_discount_amount: isMarkup ? -discountAmount : discountAmount,
        p_total_amount:    adjustedTotal,
        p_paid_amount:     totalPaidAmount,
        p_closed_by:       user.user!.id,
      });

      if (rpcError) {
        // Fallback: fluxo legado (operações em série)
        console.warn('[PaymentDialog] finalize_check RPC indisponível, usando fallback:', rpcError.message);

        const { error: itemsError } = await supabase.from('check_items').insert(items);
        if (itemsError) throw itemsError;

        const { error: totalsError } = await supabase.from('checks').update({
          subtotal: adjustedSubtotal,
          service_percent: serviceEnabled ? servicePercent : 0,
          service_amount: serviceAmount,
          discount_amount: isMarkup ? -discountAmount : discountAmount,
          total_amount: adjustedTotal,
        }).eq('id', check.id);
        if (totalsError) throw totalsError;

        const { error: paymentError } = await supabase.from('check_payments').insert(paymentRecords);
        if (paymentError) throw paymentError;

        const { error: closeError } = await supabase.from('checks').update({
          paid_amount: totalPaidAmount,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.user?.id,
          paid_at: new Date().toISOString(),
        }).eq('id', check.id);
        if (closeError) throw closeError;
      }

      // ── Pós-venda: Prazo → cria AR | Crédito → abate saldo ──
      for (const p of payments) {
        if (p.payment_method_type !== 'credit_customer' || !p.customer_id) continue;

        if (p.is_credit_debit) {
          // Abate saldo do cliente
          await supabase.rpc('deduct_customer_credit', {
            p_company_id: check.company_id,
            p_customer_id: p.customer_id,
            p_amount: p.amount,
            p_description: `Abatimento — PDV #${check.check_number}`,
            p_reference_type: 'check',
            p_reference_id: check.id,
          }).throwOnError();
        } else {
          // Prazo → cria conta a receber com vencimento em 30 dias
          const dueDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
          await supabase.from('accounts_receivable').insert({
            company_id: check.company_id,
            customer_id: p.customer_id,
            customer_name: p.customer_name,
            description: `Venda PDV #${check.check_number}`,
            amount: p.amount,
            due_date: dueDate,
            status: 'pending',
            reference_type: 'check',
            reference_id: check.id,
          }).throwOnError();
        }
      }

      clearCart();
      onOpenChange(false);
      setPayments([]);
      setDiscountValue('');
      setIsMarkup(false);

      toast({
        title: 'Venda finalizada',
        description: `Comanda #${check.check_number} fechada com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error finalizing payment:', error);

      // Best-effort rollback: se o check foi criado mas a venda falhou, marca como cancelado
      if (checkId) {
        supabase.from('checks')
          .update({ status: 'cancelled', closed_at: new Date().toISOString() })
          .eq('id', checkId)
          .then(({ error: rollbackErr }) => {
            if (rollbackErr) console.error('[PaymentDialog] Rollback falhou:', rollbackErr);
          });
      }

      toast({
        title: 'Erro ao finalizar pagamento',
        description: error?.message || 'Não foi possível processar o pagamento. Tente novamente.',
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
      setSelectedCustomer(null);
      setInputAmount('');
      setReceivedAmount('');
      setDiscountValue('');
      setIsMarkup(false);
      onOpenChange(false);
    }
  };

  const changeAmount = selectedMethod?.type === 'cash'
    ? parseAmount(receivedAmount) - parseAmount(inputAmount)
    : 0;

  const isCredit = selectedMethod?.type === 'credit_customer' &&
    selectedMethod?.name.toLowerCase().includes('crédit');

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Desconto / Acréscimo */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Desconto / Acréscimo</Label>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", !isMarkup && "font-medium")}>Desconto</span>
                  <Switch checked={isMarkup} onCheckedChange={setIsMarkup} />
                  <span className={cn("text-xs", isMarkup && "font-medium")}>Acréscimo</span>
                </div>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-24">
                      {discountType === 'percent' ? (
                        <><Percent className="w-3 h-3 mr-1" /> %</>
                      ) : (
                        <><DollarSign className="w-3 h-3 mr-1" /> R$</>
                      )}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setDiscountType('percent')}>
                      <Percent className="w-4 h-4 mr-2" /> Percentual
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDiscountType('value')}>
                      <DollarSign className="w-4 h-4 mr-2" /> Valor Fixo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? '0' : '0,00'}
                  className="flex-1 text-right font-mono"
                />
              </div>
              {discountAmount > 0 && (
                <div className={cn("text-sm font-medium text-right", isMarkup ? "text-orange-600" : "text-green-600")}>
                  {isMarkup ? '+' : '-'} {formatCurrency(discountAmount)}
                </div>
              )}
            </div>

            {/* Taxa de Serviço (mesa) */}
            {context.type === 'table' && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Taxa de Serviço</Label>
                  <Switch checked={serviceEnabled} onCheckedChange={setServiceEnabled} />
                </div>
                {serviceEnabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={servicePercent}
                      onChange={(e) => setServicePercent(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right font-mono"
                      min={0} max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className="text-sm font-medium ml-auto">{formatCurrency(serviceAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Resumo de valores */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{isMarkup ? 'Acréscimo' : 'Desconto'}</span>
                  <span className={cn("font-medium", isMarkup ? "text-orange-600" : "text-green-600")}>
                    {isMarkup ? '+' : '-'}{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
              {serviceEnabled && serviceAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Serviço ({servicePercent}%)</span>
                  <span className="font-medium">{formatCurrency(serviceAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Total da Conta</span>
                <span className="font-medium">{formatCurrency(adjustedTotal)}</span>
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

            {/* Pagamentos adicionados */}
            {payments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pagamentos Adicionados</Label>
                <ScrollArea className="max-h-32">
                  <div className="space-y-2">
                    {payments.map((payment) => {
                      const Icon = getPaymentIcon(payment.payment_method_type);
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{payment.payment_method_name}</span>
                            {payment.customer_name && (
                              <Badge variant="outline" className="text-xs">
                                <User className="w-3 h-3 mr-1" />{payment.customer_name}
                              </Badge>
                            )}
                            {payment.change_amount && payment.change_amount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Troco: {formatCurrency(payment.change_amount)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6"
                              onClick={() => handleRemovePayment(payment.id)} disabled={isProcessing}>
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

            {/* Seção de adicionar pagamento */}
            {remaining > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Adicionar Pagamento
                  <span className="text-xs text-muted-foreground ml-2">(Atalhos: 1-9)</span>
                </Label>

                {/* Grid de métodos de pagamento */}
                {!selectedMethod && (
                  <div className="grid grid-cols-4 gap-2">
                    {isLoadingMethods ? (
                      <div className="col-span-4 flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : (
                      paymentMethods.map((method, index) => {
                        const Icon = getPaymentIcon(method.type);
                        return (
                          <Button key={method.id} variant="outline"
                            className="flex flex-col h-auto py-3 gap-1 relative"
                            onClick={() => handleSelectMethod(method)}>
                            <span className="absolute top-1 left-1 text-[10px] text-muted-foreground">{index + 1}</span>
                            <Icon className="w-5 h-5" />
                            <span className="text-xs">{method.name}</span>
                          </Button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Input de valor */}
                {selectedMethod && (
                  <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => { const Icon = getPaymentIcon(selectedMethod.type); return <Icon className="w-4 h-4" />; })()}
                        <span className="font-medium">{selectedMethod.name}</span>
                        {/* Exibe cliente selecionado (Prazo/Crédito) */}
                        {selectedCustomer && (
                          <Badge variant="outline" className="text-xs">
                            <User className="w-3 h-3 mr-1" />{selectedCustomer.name}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedMethod(null); setSelectedCustomer(null); }}>
                        Cancelar
                      </Button>
                    </div>

                    {/* Saldo disponível (Crédito do Cliente) */}
                    {isCredit && selectedCustomer && (
                      <div className="flex items-center justify-between text-sm rounded bg-green-50 dark:bg-green-900/20 p-2">
                        <span className="text-muted-foreground">Saldo disponível</span>
                        <span className="font-bold text-green-600">{formatCurrency(selectedCustomer.credit_balance)}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor</Label>
                      <Input
                        ref={amountInputRef}
                        id="amount"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (selectedMethod.type === 'cash') {
                              receivedInputRef.current?.focus();
                            } else {
                              handleAddPayment();
                            }
                          }
                        }}
                        placeholder="0,00"
                        className="text-right text-lg font-mono"
                      />
                    </div>

                    {/* Seção dinheiro: valor recebido + atalhos */}
                    {selectedMethod.type === 'cash' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="received">Valor Recebido (opcional)</Label>
                          <Input
                            ref={receivedInputRef}
                            id="received"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddPayment(); }
                            }}
                            placeholder="0,00"
                            className="text-right text-lg font-mono"
                          />
                        </div>
                        {/* Atalhos rápidos de troco */}
                        <div className="flex flex-wrap gap-1.5">
                          {cashShortcuts.map((value) => (
                            <Button key={value} type="button" variant="outline" size="sm"
                              className="h-8 px-2 text-xs font-mono"
                              onClick={() => setReceivedAmount(value.toFixed(2).replace('.', ','))}>
                              R${value}
                            </Button>
                          ))}
                          <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs"
                            onClick={() => setReceivedAmount(inputAmount)}>
                            Exato
                          </Button>
                        </div>
                        {changeAmount > 0 && (
                          <div className="flex justify-between p-2 rounded bg-green-100 dark:bg-green-900/20">
                            <span className="text-sm font-medium">Troco</span>
                            <span className="font-bold text-green-600">{formatCurrency(changeAmount)}</span>
                          </div>
                        )}
                      </>
                    )}

                    <Button onClick={handleAddPayment} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Pagamento (Enter)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Estado de sucesso */}
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                'Finalizar Venda'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de busca de cliente (Prazo / Crédito do Cliente) */}
      <Dialog open={customerSearchOpen} onOpenChange={v => { if (!v) { setCustomerSearchOpen(false); setPendingMethod(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {pendingMethod?.name.toLowerCase().includes('crédit') ? 'Selecionar Cliente (Crédito)' : 'Selecionar Cliente (Prazo)'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={customerSearchRef}
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="pl-9"
              />
            </div>
            {customerQuery.trim().length >= 2 && (
              <ScrollArea className="max-h-60">
                <div className="space-y-1">
                  {customerResults.length === 0 ? (
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhum cliente encontrado.</p>
                  ) : (
                    customerResults.map(c => (
                      <button key={c.id} onClick={() => handleConfirmCustomer(c)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted text-left transition-colors">
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        </div>
                        {c.credit_balance > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Saldo: {formatCurrency(c.credit_balance)}
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
            {customerQuery.trim().length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-2">Digite ao menos 2 caracteres</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCustomerSearchOpen(false); setPendingMethod(null); }}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  Clock,
  User,
  Banknote,
  CreditCard,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Eye,
  LogOut,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CashRegisterSummary } from '@/types/pdv';

interface PaymentTypeCount {
  type: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  systemAmount: number;
  countedAmount: string;
}

interface CashRegisterClosingProps {
  summary: CashRegisterSummary;
  onClose: (data: {
    closing_amounts: Record<string, number>;
    closing_notes?: string;
    justification?: string;
  }) => void;
  onCancel: () => void;
  isClosing: boolean;
}

const getPaymentIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return Banknote;
    case 'pix':
      return QrCode;
    case 'credit':
    case 'debit':
      return CreditCard;
    default:
      return Wallet;
  }
};

const getPaymentName = (type: string) => {
  switch (type) {
    case 'cash':
      return 'Dinheiro';
    case 'pix':
      return 'PIX';
    case 'credit':
      return 'Cartão Crédito';
    case 'debit':
      return 'Cartão Débito';
    default:
      return 'Outros';
  }
};

export function CashRegisterClosing({
  summary,
  onClose,
  onCancel,
  isClosing,
}: CashRegisterClosingProps) {
  // Build payment types from summary
  const paymentTypes = useMemo(() => {
    const types: PaymentTypeCount[] = [];
    
    // Always include cash first
    const cashExpected = summary.opening_amount + (summary.total_cash || 0) + (summary.total_deposits || 0) - (summary.total_withdrawals || 0);
    types.push({
      type: 'cash',
      name: 'Dinheiro',
      icon: Banknote,
      systemAmount: cashExpected,
      countedAmount: '',
    });

    if ((summary.total_pix || 0) > 0) {
      types.push({
        type: 'pix',
        name: 'PIX',
        icon: QrCode,
        systemAmount: summary.total_pix || 0,
        countedAmount: String(summary.total_pix || 0),
      });
    }

    // Split card into credit and debit if detailed data available
    if ((summary.total_card || 0) > 0) {
      const creditTotal = summary.payments_by_type?.find(p => p.type === 'credit')?.total || 0;
      const debitTotal = summary.payments_by_type?.find(p => p.type === 'debit')?.total || 0;
      
      if (creditTotal > 0) {
        types.push({
          type: 'credit',
          name: 'Cartão Crédito',
          icon: CreditCard,
          systemAmount: creditTotal,
          countedAmount: String(creditTotal),
        });
      }
      if (debitTotal > 0) {
        types.push({
          type: 'debit',
          name: 'Cartão Débito',
          icon: CreditCard,
          systemAmount: debitTotal,
          countedAmount: String(debitTotal),
        });
      }
      // If no breakdown, show as single card
      if (creditTotal === 0 && debitTotal === 0 && (summary.total_card || 0) > 0) {
        types.push({
          type: 'card',
          name: 'Cartão',
          icon: CreditCard,
          systemAmount: summary.total_card || 0,
          countedAmount: String(summary.total_card || 0),
        });
      }
    }

    return types;
  }, [summary]);

  const [countedAmounts, setCountedAmounts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    paymentTypes.forEach((pt) => {
      initial[pt.type] = pt.countedAmount;
    });
    return initial;
  });
  const [justification, setJustification] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Calculate differences
  const differences = useMemo(() => {
    const diffs: Record<string, number> = {};
    paymentTypes.forEach((pt) => {
      const counted = parseFloat(countedAmounts[pt.type] || '0') || 0;
      diffs[pt.type] = counted - pt.systemAmount;
    });
    return diffs;
  }, [countedAmounts, paymentTypes]);

  const totalSystem = useMemo(() => 
    paymentTypes.reduce((acc, pt) => acc + pt.systemAmount, 0), 
    [paymentTypes]
  );

  const totalCounted = useMemo(() => 
    Object.values(countedAmounts).reduce((acc, v) => acc + (parseFloat(v) || 0), 0), 
    [countedAmounts]
  );

  const totalDifference = totalCounted - totalSystem;

  // Time calculations
  const openedAt = summary.opened_at ? new Date(summary.opened_at) : new Date();
  const now = new Date();
  const minutesOpen = differenceInMinutes(now, openedAt);
  const hoursOpen = differenceInHours(now, openedAt);
  const timeDisplay = hoursOpen >= 1 
    ? `${hoursOpen}h ${minutesOpen % 60}min` 
    : `${minutesOpen} min`;

  const handleUpdateCounted = (type: string, value: string) => {
    setCountedAmounts((prev) => ({ ...prev, [type]: value }));
  };

  const handleConfirmClose = () => {
    const closingAmounts: Record<string, number> = {};
    Object.entries(countedAmounts).forEach(([type, value]) => {
      closingAmounts[type] = parseFloat(value) || 0;
    });

    onClose({
      closing_amounts: closingAmounts,
      closing_notes: closingNotes || undefined,
      justification: totalDifference !== 0 ? justification : undefined,
    });
    setShowConfirmation(false);
    setShowSuccess(true);
  };

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return 'text-success';
    if (diff < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getDifferenceBg = (diff: number) => {
    if (diff > 0) return 'bg-success/10 border-success/30';
    if (diff < 0) return 'bg-destructive/10 border-destructive/30';
    return 'bg-muted/50';
  };

  // Success screen removed - now handled by parent via CashRegisterSuccessDialog

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Fechamento de Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Confirme os valores para encerrar o caixa
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Caixa</p>
                <p className="font-medium">{summary.terminal_name || '#1'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Aberto há</p>
                <p className="font-medium">{timeDisplay}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Operador</p>
                <p className="font-medium truncate">{summary.operator_name || 'Operador'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Abertura</p>
                <p className="font-medium">
                  {format(openedAt, "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Receipt className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Atendimentos</p>
            <p className="text-lg font-bold">{summary.total_checks || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-success mb-1" />
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-lg font-bold">{formatCurrency(summary.average_ticket || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-success mb-1" />
            <p className="text-xs text-muted-foreground">Suprimentos</p>
            <p className="text-lg font-bold text-success">+{formatCurrency(summary.total_deposits || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 mx-auto text-warning mb-1" />
            <p className="text-xs text-muted-foreground">Sangrias</p>
            <p className="text-lg font-bold text-warning">-{formatCurrency(summary.total_withdrawals || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Movements Summary */}
      {summary.movements && summary.movements.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Movimentações do Período</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-32">
              <div className="space-y-2">
                {summary.movements.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      {mov.movement_type === 'withdrawal' ? (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-success" />
                      )}
                      <span>{mov.movement_type === 'withdrawal' ? 'Sangria' : 'Suprimento'}</span>
                      {mov.reason && <span className="text-muted-foreground">- {mov.reason}</span>}
                    </div>
                    <span className={mov.movement_type === 'withdrawal' ? 'text-destructive' : 'text-success'}>
                      {mov.movement_type === 'withdrawal' ? '-' : '+'}{formatCurrency(mov.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Conferência por Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground px-2">
              <div>Forma</div>
              <div className="text-right">Sistema</div>
              <div className="text-right">Contado</div>
              <div className="text-right">Diferença</div>
            </div>
            <Separator />
            
            {/* Rows */}
            {paymentTypes.map((pt) => {
              const Icon = pt.icon;
              const diff = differences[pt.type] || 0;
              return (
                <div 
                  key={pt.type} 
                  className={`grid grid-cols-4 gap-2 items-center p-2 rounded-lg ${getDifferenceBg(diff)}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{pt.name}</span>
                  </div>
                  <div className="text-right font-mono text-sm">
                    {formatCurrency(pt.systemAmount)}
                  </div>
                  <div className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={countedAmounts[pt.type]}
                      onChange={(e) => handleUpdateCounted(pt.type, e.target.value)}
                      className="h-8 text-right font-mono text-sm max-w-24 ml-auto"
                      placeholder="0,00"
                    />
                  </div>
                  <div className={`text-right font-mono text-sm font-bold ${getDifferenceColor(diff)}`}>
                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Justification - Only if difference */}
      {totalDifference !== 0 && (
        <Card className="border-warning">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">
                  Diferença de {formatCurrency(Math.abs(totalDifference))} detectada
                </p>
                <Label htmlFor="justification" className="text-xs text-muted-foreground">
                  Informe o motivo da diferença (obrigatório)
                </Label>
                <Textarea
                  id="justification"
                  placeholder="Ex: Erro de troco, falta de conferência..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optional Notes */}
      <Card>
        <CardContent className="p-4">
          <Label htmlFor="notes" className="text-sm">Observações (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Adicione observações sobre o fechamento..."
            value={closingNotes}
            onChange={(e) => setClosingNotes(e.target.value)}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
        <div className="max-w-4xl mx-auto">
          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Sistema</p>
              <p className="text-lg font-bold">{formatCurrency(totalSystem)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contado</p>
              <p className="text-lg font-bold">{formatCurrency(totalCounted)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className={`text-lg font-bold ${getDifferenceColor(totalDifference)}`}>
                {totalDifference >= 0 ? '+' : ''}{formatCurrency(totalDifference)}
              </p>
              {totalDifference !== 0 && (
                <Badge variant={totalDifference > 0 ? 'default' : 'destructive'} className="text-xs mt-1">
                  {totalDifference > 0 ? 'Sobra' : 'Falta'}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={() => setShowConfirmation(true)}
              disabled={isClosing || (totalDifference !== 0 && justification.length < 10)}
            >
              {isClosing ? 'Fechando...' : 'Fechar Caixa'}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Fechamento de Caixa</DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Sistema</p>
                <p className="font-bold text-lg">{formatCurrency(totalSystem)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Contado</p>
                <p className="font-bold text-lg">{formatCurrency(totalCounted)}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className={`p-3 rounded-lg ${getDifferenceBg(totalDifference)}`}>
              <div className="flex items-center justify-between">
                <span>Diferença</span>
                <span className={`font-bold ${getDifferenceColor(totalDifference)}`}>
                  {totalDifference >= 0 ? '+' : ''}{formatCurrency(totalDifference)}
                </span>
              </div>
            </div>

            {totalDifference !== 0 && justification && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Justificativa</p>
                <p className="text-sm">{justification}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Operador</p>
                <p className="font-medium">{summary.operator_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data/Hora</p>
                <p className="font-medium">{format(new Date(), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Voltar
            </Button>
            <Button onClick={handleConfirmClose} disabled={isClosing}>
              {isClosing ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

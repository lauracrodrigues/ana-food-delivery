import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Wallet, 
  Clock,
  User,
  Banknote,
  CreditCard,
  QrCode,
  Printer,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CashRegister } from '@/types/pdv';

interface CashRegisterSummaryViewProps {
  register: CashRegister;
  onBack?: () => void;
  onPrint?: () => void;
}

export function CashRegisterSummaryView({ 
  register, 
  onBack,
  onPrint 
}: CashRegisterSummaryViewProps) {
  const openedAt = register.opened_at ? new Date(register.opened_at) : new Date();
  const closedAt = register.closed_at ? new Date(register.closed_at) : new Date();
  
  const minutesOpen = differenceInMinutes(closedAt, openedAt);
  const hoursOpen = differenceInHours(closedAt, openedAt);
  const timeDisplay = hoursOpen >= 1 
    ? `${hoursOpen}h ${minutesOpen % 60}min` 
    : `${minutesOpen} min`;

  const difference = register.difference || 0;
  const hasDifference = difference !== 0;

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return 'text-success';
    if (diff < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-3xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Resumo do Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Fechamento realizado com sucesso
          </p>
        </div>
        {onPrint && (
          <Button variant="outline" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">FECHAMENTO DE CAIXA</h1>
        <p className="text-sm">{register.terminal_name || 'Caixa #1'}</p>
      </div>

      {/* Status Badge */}
      <div className="flex justify-center">
        <Badge 
          variant={hasDifference ? 'secondary' : 'default'} 
          className={`text-sm px-4 py-1 ${!hasDifference ? 'bg-success text-success-foreground' : ''}`}
        >
          {hasDifference ? (
            <>
              <AlertTriangle className="w-4 h-4 mr-1" />
              Fechado com diferença
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Fechado sem diferença
            </>
          )}
        </Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Informações do Caixa</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Terminal</p>
                <p className="font-medium">{register.terminal_name || 'Caixa #1'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Operador</p>
                <p className="font-medium">{register.operator_name || 'Operador'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Abertura</p>
                <p className="font-medium">
                  {format(openedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Fechamento</p>
                <p className="font-medium">
                  {format(closedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo Aberto</p>
                <p className="font-medium">{timeDisplay}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Fundo Inicial</span>
            <span className="font-mono">{formatCurrency(register.opening_amount || 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Valor Esperado</span>
            <span className="font-mono font-bold">{formatCurrency(register.expected_amount || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Valor Contado</span>
            <span className="font-mono font-bold">{formatCurrency(register.closing_amount || 0)}</span>
          </div>
          <Separator />
          <div className={`flex justify-between items-center p-3 rounded-lg ${
            difference > 0 ? 'bg-success/10' : difference < 0 ? 'bg-destructive/10' : 'bg-muted/50'
          }`}>
            <span className="font-medium">Diferença</span>
            <span className={`font-mono font-bold text-lg ${getDifferenceColor(difference)}`}>
              {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {register.closing_notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm">{register.closing_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions - Hide on print */}
      <div className="flex gap-3 print:hidden">
        {onBack && (
          <Button variant="outline" className="flex-1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
        {onPrint && (
          <Button className="flex-1" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        )}
      </div>
    </div>
  );
}

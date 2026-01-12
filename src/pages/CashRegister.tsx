import { useState } from 'react';
import { useCashRegister } from '@/hooks/pdv/useCashRegister';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CashRegister() {
  const { 
    activeRegister, 
    summary, 
    isLoading,
    isRegisterOpen,
    openRegister,
    closeRegister,
    addMovement,
    isOpening,
    isClosing,
  } = useCashRegister();

  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementType, setMovementType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);

  const handleOpenRegister = () => {
    openRegister({
      opening_amount: parseFloat(openingAmount) || 0,
      opening_notes: openingNotes || undefined,
    });
    setIsOpenDialogOpen(false);
    setOpeningAmount('');
    setOpeningNotes('');
  };

  const handleCloseRegister = () => {
    closeRegister({
      closing_amount: parseFloat(closingAmount) || 0,
      closing_notes: closingNotes || undefined,
    });
    setIsCloseDialogOpen(false);
    setClosingAmount('');
    setClosingNotes('');
  };

  const handleAddMovement = () => {
    addMovement({
      movement_type: movementType,
      amount: parseFloat(movementAmount) || 0,
      reason: movementReason || undefined,
    });
    setIsMovementDialogOpen(false);
    setMovementAmount('');
    setMovementReason('');
  };

  // Calculate expected cash
  const expectedCash = summary ? 
    summary.opening_amount + summary.total_cash + summary.total_deposits - summary.total_withdrawals : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Register closed state
  if (!isRegisterOpen) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle>Caixa Fechado</CardTitle>
            <CardDescription>
              Abra o caixa para iniciar as vendas do dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Abrir Caixa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abrir Caixa</DialogTitle>
                  <DialogDescription>
                    Informe o valor inicial do caixa para começar as operações
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="opening-amount">Valor Inicial (Fundo de Troco)</Label>
                    <Input
                      id="opening-amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="opening-notes">Observações (opcional)</Label>
                    <Textarea
                      id="opening-notes"
                      placeholder="Adicione observações sobre a abertura..."
                      value={openingNotes}
                      onChange={(e) => setOpeningNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleOpenRegister} disabled={isOpening}>
                    {isOpening ? 'Abrindo...' : 'Confirmar Abertura'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Register open state - show summary
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Caixa</h1>
            <p className="text-sm text-muted-foreground">
              Aberto em {activeRegister?.opened_at ? format(new Date(activeRegister.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Aberto
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fundo Inicial</p>
                <p className="text-xl font-bold">{formatCurrency(activeRegister?.opening_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vendas</p>
                <p className="text-xl font-bold text-success">{formatCurrency(summary?.total_sales || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sangrias</p>
                <p className="text-xl font-bold text-warning">{formatCurrency(summary?.total_withdrawals || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Banknote className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dinheiro Esperado</p>
                <p className="text-xl font-bold">{formatCurrency(expectedCash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-success" />
                <span>Dinheiro</span>
              </div>
              <span className="font-bold">{formatCurrency(summary?.total_cash || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-500" />
                <span>Cartão</span>
              </div>
              <span className="font-bold">{formatCurrency(summary?.total_card || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-purple-500" />
                <span>PIX</span>
              </div>
              <span className="font-bold">{formatCurrency(summary?.total_pix || 0)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Movimentações</CardTitle>
            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Movimentação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button
                      variant={movementType === 'withdrawal' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setMovementType('withdrawal')}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Sangria
                    </Button>
                    <Button
                      variant={movementType === 'deposit' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setMovementType('deposit')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Suprimento
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={movementAmount}
                      onChange={(e) => setMovementAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Textarea
                      placeholder="Descreva o motivo..."
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddMovement}>
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {summary?.movements && summary.movements.length > 0 ? (
                <div className="space-y-2">
                  {summary.movements.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        {mov.movement_type === 'withdrawal' ? (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-success" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {mov.movement_type === 'withdrawal' ? 'Sangria' : 'Suprimento'}
                          </p>
                          {mov.reason && (
                            <p className="text-xs text-muted-foreground">{mov.reason}</p>
                          )}
                        </div>
                      </div>
                      <span className={`font-bold ${mov.movement_type === 'withdrawal' ? 'text-destructive' : 'text-success'}`}>
                        {mov.movement_type === 'withdrawal' ? '-' : '+'}{formatCurrency(mov.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhuma movimentação</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Close Register */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Fechar Caixa</h3>
              <p className="text-sm text-muted-foreground">
                Encerrar as operações e gerar relatório de fechamento
              </p>
            </div>
            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  Fechar Caixa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fechar Caixa</DialogTitle>
                  <DialogDescription>
                    Confirme o valor em caixa para encerrar as operações
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Valor esperado:</span>
                      <span className="font-bold">{formatCurrency(expectedCash)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing-amount">Valor Contado</Label>
                    <Input
                      id="closing-amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={closingAmount}
                      onChange={(e) => setClosingAmount(e.target.value)}
                    />
                  </div>
                  {closingAmount && parseFloat(closingAmount) !== expectedCash && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                      <div className="flex items-center gap-2 text-warning">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Diferença de {formatCurrency(Math.abs(parseFloat(closingAmount) - expectedCash))}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="closing-notes">Observações (opcional)</Label>
                    <Textarea
                      id="closing-notes"
                      placeholder="Adicione observações sobre o fechamento..."
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleCloseRegister} disabled={isClosing}>
                    {isClosing ? 'Fechando...' : 'Confirmar Fechamento'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

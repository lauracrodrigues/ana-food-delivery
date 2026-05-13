// v3.2.0 — Financeiro: usa status-helpers, useStoreSettings, useWhatsAppSend centralizados
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Receipt,
  CreditCard, Banknote, QrCode, BarChart2, Calendar, Plus, Trash2, Loader2,
  CheckCircle2, AlertCircle, Clock, BookOpen, MessageSquare, Send,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { getBillStatus, BILL_STATUS_CLASS, getPaymentIcon, getPaymentLabel } from '@/lib/status-helpers';
import { formatDateBR, formatISODate, formatDateLong } from '@/lib/date-formatter';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useWhatsAppSend } from '@/hooks/useWhatsAppSend';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  subDays, startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, format, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ────────────────────────────────────────────────────────────
// Tipos

interface SalesSummary {
  gross_revenue: number;
  order_count: number;
  average_ticket: number;
  discount_total: number;
  by_payment: { method: string; total: number; count: number }[];
  by_day: { date: string; total: number }[];
  by_source: { source: string; total: number; count: number }[];
}

interface Expense {
  id: string;
  company_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  due_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  paid_amount: number | null;
  chart_account_id: string | null;
  document_number: string | null;
  recurrent: boolean;
  notes: string | null;
  created_at: string;
}

interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
}

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type BillStatus = 'all' | 'pending' | 'overdue' | 'paid';

// ────────────────────────────────────────────────────────────
// Constantes

const EXPENSE_CATEGORIES = [
  { value: 'insumos', label: 'Insumos / Matéria-Prima' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'funcionarios', label: 'Funcionários' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'servicos', label: 'Serviços (água, luz, internet)' },
  { value: 'impostos', label: 'Impostos / Taxas' },
  { value: 'outros', label: 'Outros' },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom', label: 'Personalizado' },
];

// paymentIcon, paymentLabel, BILL_STATUS_CLASS, getBillStatus → importados de @/lib/status-helpers

// ────────────────────────────────────────────────────────────
// Helpers

function getPeriodDates(period: PeriodKey, customStart?: string, customEnd?: string) {
  const now = new Date();
  switch (period) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': { const y = subDays(now, 1); return { start: startOfDay(y), end: endOfDay(y) }; }
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'custom': return {
      start: customStart ? startOfDay(parseISO(customStart)) : startOfDay(now),
      end: customEnd ? endOfDay(parseISO(customEnd)) : endOfDay(now),
    };
  }
}

function getPreviousPeriod(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - diff - 1), end: new Date(start.getTime() - 1) };
}

// getBillStatus → importado de @/lib/status-helpers

// ────────────────────────────────────────────────────────────
// Hooks de dados

function useFinancialReport(start: Date, end: Date) {
  const { companyId } = useCompanyId();

  const ordersQuery = useQuery({
    queryKey: ['fin-orders', companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('orders').select('id,total,discount_amount,payment_method,type,created_at,status')
        .eq('company_id', companyId).neq('status', 'cancelled')
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      return data || [];
    },
    enabled: !!companyId,
  });

  const checksQuery = useQuery({
    queryKey: ['fin-checks', companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('checks').select('id,total_amount,discount_amount,subtotal,created_at,closed_at,status,type')
        .eq('company_id', companyId).eq('status', 'closed')
        .gte('closed_at', start.toISOString()).lte('closed_at', end.toISOString());
      return data || [];
    },
    enabled: !!companyId,
  });

  const paymentsQuery = useQuery({
    queryKey: ['fin-payments', companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('check_payments').select('id,amount,payment_method_type,payment_method_name,check_id,created_at')
        .eq('company_id', companyId).eq('status', 'completed')
        .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
      return data || [];
    },
    enabled: !!companyId,
  });

  const summary = useMemo<SalesSummary>(() => {
    const orders = ordersQuery.data || [];
    const checks = checksQuery.data || [];
    const payments = paymentsQuery.data || [];

    const orderRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const checkRevenue = checks.reduce((s, c) => s + Number(c.total_amount || 0), 0);
    const gross_revenue = orderRevenue + checkRevenue;
    const order_count = orders.length + checks.length;
    const average_ticket = order_count > 0 ? gross_revenue / order_count : 0;
    const discount_total = orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0)
      + checks.reduce((s, c) => s + Number(c.discount_amount || 0), 0);

    const payMap: Record<string, { total: number; count: number }> = {};
    for (const p of payments) {
      const k = p.payment_method_type || 'default';
      if (!payMap[k]) payMap[k] = { total: 0, count: 0 };
      payMap[k].total += Number(p.amount || 0); payMap[k].count += 1;
    }
    for (const o of orders) {
      const k = o.payment_method || 'default';
      if (!payMap[k]) payMap[k] = { total: 0, count: 0 };
      payMap[k].total += Number(o.total || 0); payMap[k].count += 1;
    }
    const by_payment = Object.entries(payMap).map(([method, d]) => ({ method, ...d })).sort((a, b) => b.total - a.total);

    const dayMap: Record<string, number> = {};
    orders.forEach(o => o.created_at && (dayMap[o.created_at.slice(0, 10)] = (dayMap[o.created_at.slice(0, 10)] || 0) + Number(o.total || 0)));
    checks.forEach(c => c.closed_at && (dayMap[c.closed_at.slice(0, 10)] = (dayMap[c.closed_at.slice(0, 10)] || 0) + Number(c.total_amount || 0)));
    const by_day = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }));

    const by_source = [
      { source: 'pdv', total: checkRevenue, count: checks.length },
      { source: 'online', total: orderRevenue, count: orders.length },
    ];

    return { gross_revenue, order_count, average_ticket, discount_total, by_payment, by_day, by_source };
  }, [ordersQuery.data, checksQuery.data, paymentsQuery.data]);

  return { summary, isLoading: ordersQuery.isLoading || checksQuery.isLoading || paymentsQuery.isLoading };
}

function useChartAccounts() {
  const { companyId } = useCompanyId();
  return useQuery<ChartAccount[]>({
    queryKey: ['chart-accounts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('chart_of_accounts').select('id,code,name,type,parent_id,is_active')
        .eq('company_id', companyId).eq('is_active', true).order('code');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10,
  });
}

function useExpenses(start: Date, end: Date) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', companyId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('expenses').select('*')
        .eq('company_id', companyId)
        .gte('date', start.toISOString().slice(0, 10))
        .lte('date', end.toISOString().slice(0, 10))
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<Expense>) => {
      if (!companyId) throw new Error('Company ID não encontrado');
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('expenses').insert({
        ...data, company_id: companyId, created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', companyId] });
      queryClient.invalidateQueries({ queryKey: ['bills', companyId] });
      toast({ title: 'Despesa registrada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', companyId] });
      queryClient.invalidateQueries({ queryKey: ['bills', companyId] });
      toast({ title: 'Despesa removida' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  return { expenses, isLoading, addMutation, deleteMutation };
}

// Hook dedicado para contas a pagar (sem filtro de período — mostra pendentes)
function useBills() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['bills', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // Busca pendentes e vencidas sem filtro de período; pagas do mês atual
      const { data, error } = await supabase.from('expenses')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'overdue', 'paid'])
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const payMutation = useMutation({
    mutationFn: async (data: { id: string; paid_amount: number; paid_at: string; chart_account_id: string | null }) => {
      const { error } = await supabase.from('expenses').update({
        status: 'paid',
        paid_amount: data.paid_amount,
        paid_at: data.paid_at,
        chart_account_id: data.chart_account_id,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', companyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', companyId] });
      toast({ title: 'Pagamento registrado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao registrar', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', companyId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', companyId] });
      toast({ title: 'Conta removida' });
    },
    onError: (e: any) => toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });

  return { bills, isLoading, payMutation, deleteMutation };
}

// ────────────────────────────────────────────────────────────
// Componentes compartilhados

function KpiCard({ title, value, sub, icon: Icon, trend, trendLabel, className }: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  trend?: number; trendLabel?: string; className?: string;
}) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 mt-3 text-sm', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}% {trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodSelector({ period, setPeriod, customStart, setCustomStart, customEnd, setCustomEnd }: {
  period: PeriodKey; setPeriod: (p: PeriodKey) => void;
  customStart: string; setCustomStart: (s: string) => void;
  customEnd: string; setCustomEnd: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {PERIOD_OPTIONS.map(opt => (
        <Button key={opt.key} variant={period === opt.key ? 'default' : 'outline'} size="sm" onClick={() => setPeriod(opt.key)}>
          {opt.key === 'custom' && <Calendar className="w-3 h-3 mr-1" />}
          {opt.label}
        </Button>
      ))}
      {period === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background" />
          <span className="text-muted-foreground">→</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            className="border rounded px-2 py-1 text-sm bg-background" />
        </div>
      )}
    </div>
  );
}

// useStoreSettings → importado de @/hooks/useStoreSettings

// ────────────────────────────────────────────────────────────
// Dialog: Compartilhar relatório via WhatsApp

function WhatsAppReportDialog({ summary, periodLabel, onClose }: {
  summary: SalesSummary;
  periodLabel: string;
  onClose: () => void;
}) {
  const { send: sendWhatsApp, hasSession } = useWhatsAppSend();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  // Monta mensagem formatada
  const message = [
    `📊 *Relatório Financeiro*`,
    `📅 ${periodLabel}`,
    ``,
    `💰 *Faturamento Bruto:* ${formatCurrency(summary.gross_revenue)}`,
    `🛒 *Vendas:* ${summary.order_count} (Ticket médio: ${formatCurrency(summary.average_ticket)})`,
    summary.discount_total > 0 ? `🏷️ *Descontos:* ${formatCurrency(summary.discount_total)}` : '',
    ``,
    `💳 *Por Forma de Pagamento:*`,
    ...summary.by_payment.map(p => `  • ${getPaymentLabel(p.method)}: ${formatCurrency(p.total)} (${p.count}x)`),
    ``,
    `📦 *Canal de Vendas:*`,
    ...summary.by_source.map(s => `  • ${s.source === 'pdv' ? 'PDV' : 'Online'}: ${formatCurrency(s.total)} (${s.count} vendas)`),
  ].filter(Boolean).join('\n');

  const handleSend = async () => {
    setSending(true);
    await sendWhatsApp({ phone, message });
    setSending(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600" /> Compartilhar Relatório
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Enviar para (telefone)</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              autoFocus
            />
            {!hasSession && (
              <p className="text-xs text-muted-foreground mt-1">Sem sessão Evolution ativa — abrirá WhatsApp Web</p>
            )}
          </div>
          {/* Preview da mensagem */}
          <div>
            <Label>Preview da mensagem</Label>
            <div className="mt-1 rounded-lg border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap max-h-52 overflow-y-auto">
              {message}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Aba: Relatórios de Vendas

function RelatoriosTab({ start, end, periodLabel }: { start: Date; end: Date; periodLabel: string }) {
  const { summary, isLoading } = useFinancialReport(start, end);
  const { start: prevStart, end: prevEnd } = getPreviousPeriod(start, end);
  const { summary: prevSummary } = useFinancialReport(prevStart, prevEnd);
  const [showWAReport, setShowWAReport] = useState(false);

  const revenueTrend = prevSummary.gross_revenue > 0
    ? ((summary.gross_revenue - prevSummary.gross_revenue) / prevSummary.gross_revenue) * 100
    : undefined;
  const orderTrend = prevSummary.order_count > 0
    ? ((summary.order_count - prevSummary.order_count) / prevSummary.order_count) * 100
    : undefined;

  // Label do período para o relatório WhatsApp (recebe via prop periodLabel)
  // Usamos um placeholder; o valor real vem do componente pai via prop
  return (
    <div className="space-y-6">
      {/* Botão compartilhar via WhatsApp */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-50"
          onClick={() => setShowWAReport(true)}>
          <MessageSquare className="w-4 h-4 mr-1.5" /> Compartilhar via WhatsApp
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Faturamento Bruto" value={formatCurrency(summary.gross_revenue)} icon={DollarSign}
          trend={revenueTrend} trendLabel="vs período anterior" />
        <KpiCard title="Vendas" value={String(summary.order_count)} sub="PDV + Online" icon={ShoppingBag}
          trend={orderTrend} trendLabel="vs período anterior" />
        <KpiCard title="Ticket Médio" value={formatCurrency(summary.average_ticket)} icon={Receipt} />
        <KpiCard title="Descontos" value={formatCurrency(summary.discount_total)} icon={TrendingDown}
          className={summary.discount_total > 0 ? 'border-orange-200' : ''} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
            ) : summary.by_payment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda no período</p>
            ) : (
              <div className="space-y-3">
                {summary.by_payment.map(p => {
                  const Icon = getPaymentIcon(p.method);
                  const pct = summary.gross_revenue > 0 ? (p.total / summary.gross_revenue) * 100 : 0;
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{getPaymentLabel(p.method)}</span>
                          <span className="text-xs text-muted-foreground">({p.count}x)</span>
                        </div>
                        <span className="font-medium">{formatCurrency(p.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Canal de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.by_source.map(s => {
                const pct = summary.gross_revenue > 0 ? (s.total / summary.gross_revenue) * 100 : 0;
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        {s.source === 'pdv' ? <Receipt className="w-4 h-4 text-muted-foreground" /> : <ShoppingBag className="w-4 h-4 text-muted-foreground" />}
                        <span>{s.source === 'pdv' ? 'PDV (Caixa)' : 'Online (Delivery/WhatsApp)'}</span>
                        <span className="text-xs text-muted-foreground">({s.count} vendas)</span>
                      </div>
                      <span className="font-medium">{formatCurrency(s.total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', s.source === 'pdv' ? 'bg-blue-500' : 'bg-orange-500')}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span><span>{formatCurrency(summary.gross_revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.by_day.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Evolução Diária</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex items-end gap-2 h-32 min-w-max pb-6 px-1">
                {summary.by_day.map(d => {
                  const max = Math.max(...summary.by_day.map(x => x.total));
                  const height = max > 0 ? Math.max(4, (d.total / max) * 100) : 4;
                  return (
                    <div key={d.date} className="flex flex-col items-center gap-1 min-w-[40px]">
                      <span className="text-[10px] text-muted-foreground font-mono">{formatCurrency(d.total).replace('R$ ', '')}</span>
                      <div className="w-8 bg-primary/80 rounded-t hover:bg-primary transition-colors"
                        style={{ height: `${height}%` }} title={`${d.date}: ${formatCurrency(d.total)}`} />
                      <span className="text-[10px] text-muted-foreground">{format(parseISO(d.date), 'dd/MM')}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Dialog WhatsApp Reports */}
      {showWAReport && (
        <WhatsAppReportDialog
          summary={summary}
          periodLabel={periodLabel}
          onClose={() => setShowWAReport(false)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Dialog: Registrar pagamento de conta

function PayBillDialog({ bill, accounts, onClose, payMutation }: {
  bill: Expense;
  accounts: ChartAccount[];
  onClose: () => void;
  payMutation: ReturnType<typeof useBills>['payMutation'];
}) {
  const [form, setForm] = useState({
    paid_amount: String(bill.amount),
    paid_at: format(new Date(), 'yyyy-MM-dd'),
    chart_account_id: bill.chart_account_id || '',
  });

  const handlePay = () => {
    const amount = parseFloat(form.paid_amount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    payMutation.mutate({
      id: bill.id,
      paid_amount: amount,
      paid_at: form.paid_at,
      chart_account_id: form.chart_account_id || null,
    }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium text-sm">{bill.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valor original: {formatCurrency(Number(bill.amount))}
              {bill.due_date && ` · Vence: ${format(parseISO(bill.due_date), 'dd/MM/yyyy')}`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Pago (R$) *</Label>
              <Input
                value={form.paid_amount}
                onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))}
                placeholder="0,00"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input
                type="date"
                value={form.paid_at}
                onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Plano de Contas
            </Label>
            <Select
              value={form.chart_account_id}
              onValueChange={v => setForm(f => ({ ...f, chart_account_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => !a.parent_id === false || true).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePay} disabled={payMutation.isPending} className="bg-green-600 hover:bg-green-700">
            {payMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Aba: Contas a Pagar

function ContasAPagarTab() {
  const { bills, isLoading, payMutation, deleteMutation } = useBills();
  const { data: accounts = [] } = useChartAccounts();
  const [statusFilter, setStatusFilter] = useState<BillStatus>('pending');
  const [payingBill, setPayingBill] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = bills.filter(b => {
    const s = getBillStatus(b);
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return s === 'pending' || s === 'overdue';
    return s === statusFilter;
  });

  const totalPending = bills.filter(b => getBillStatus(b) === 'pending').reduce((s, b) => s + Number(b.amount), 0);
  const totalOverdue = bills.filter(b => getBillStatus(b) === 'overdue').reduce((s, b) => s + Number(b.amount), 0);
  const totalPaid = bills.filter(b => getBillStatus(b) === 'paid').reduce((s, b) => s + Number(b.paid_amount || b.amount), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="A Pagar" value={formatCurrency(totalPending)} sub="Contas pendentes" icon={Clock} />
        <KpiCard title="Vencidas" value={formatCurrency(totalOverdue)} icon={AlertCircle}
          className={totalOverdue > 0 ? 'border-red-300' : ''} />
        <KpiCard title="Pagas (histórico)" value={formatCurrency(totalPaid)} icon={CheckCircle2}
          className="border-green-200" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['pending', 'overdue', 'paid', 'all'] as BillStatus[]).map(s => {
          const labels: Record<BillStatus, string> = { pending: 'Pendentes', overdue: 'Vencidas', paid: 'Pagas', all: 'Todas' };
          return (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setStatusFilter(s)}>
              {labels[s]}
            </Button>
          );
        })}
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma conta encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(bill => {
                  const status = getBillStatus(bill);
                  return (
                    <TableRow key={bill.id} className={BILL_STATUS_CLASS[status]}>
                      <TableCell>
                        <p className="text-sm font-medium">{bill.description}</p>
                        {bill.notes && <p className="text-xs text-muted-foreground">{bill.notes}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {EXPENSE_CATEGORIES.find(c => c.value === bill.category)?.label ?? bill.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {bill.due_date ? format(parseISO(bill.due_date), 'dd/MM/yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        {status === 'overdue' && <Badge className="bg-red-100 text-red-700 border-red-200">Vencida</Badge>}
                        {status === 'pending' && <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>}
                        {status === 'paid' && <Badge className="bg-green-100 text-green-700 border-green-200">Paga</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {status === 'paid'
                          ? <span className="text-green-600">{formatCurrency(Number(bill.paid_amount || bill.amount))}</span>
                          : <span className="text-red-600">{formatCurrency(Number(bill.amount))}</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {status !== 'paid' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700 hover:text-green-800"
                              onClick={() => setPayingBill(bill)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pagar
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setDeletingId(bill.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog pagamento */}
      {payingBill && (
        <PayBillDialog
          bill={payingBill}
          accounts={accounts}
          onClose={() => setPayingBill(null)}
          payMutation={payMutation}
        />
      )}

      {/* Confirmar exclusão — usa ConfirmDeleteDialog centralizado */}
      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={v => !v && setDeletingId(null)}
        title="Remover conta?"
        confirmLabel="Remover"
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Aba: Despesas

function DespesasTab({ start, end, grossRevenue }: { start: Date; end: Date; grossRevenue: number }) {
  const { expenses, isLoading, addMutation, deleteMutation } = useExpenses(start, end);
  const { data: accounts = [] } = useChartAccounts();
  const [showDialog, setShowDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'outros',
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    status: 'paid' as 'pending' | 'paid',
    chart_account_id: '',
    document_number: '',
    recurrent: false,
    notes: '',
  });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const resultado = grossRevenue - totalExpenses;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const handleAdd = () => {
    if (!form.description.trim()) return;
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    addMutation.mutate({
      category: form.category,
      description: form.description.trim(),
      amount,
      date: form.date,
      due_date: form.due_date || null,
      status: form.status,
      chart_account_id: form.chart_account_id || null,
      document_number: form.document_number || null,
      recurrent: form.recurrent,
      notes: form.notes || null,
      paid_at: form.status === 'paid' ? form.date : null,
      paid_amount: form.status === 'paid' ? amount : null,
    } as Partial<Expense>, {
      onSuccess: () => {
        setShowDialog(false);
        setForm({ category: 'outros', description: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), due_date: '', status: 'paid', chart_account_id: '', document_number: '', recurrent: false, notes: '' });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* KPIs de resultado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total de Despesas" value={formatCurrency(totalExpenses)} icon={TrendingDown}
          className={totalExpenses > 0 ? 'border-red-200' : ''} />
        <KpiCard title="Faturamento" value={formatCurrency(grossRevenue)} icon={DollarSign} />
        <Card className={cn('', resultado >= 0 ? 'border-green-300' : 'border-red-300')}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                <p className={cn('text-2xl font-bold', resultado >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(resultado)}
                </p>
                <p className="text-xs text-muted-foreground">Faturamento − Despesas</p>
              </div>
              <div className={cn('p-2 rounded-lg', resultado >= 0 ? 'bg-green-100' : 'bg-red-100')}>
                {resultado >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Despesas no Período</h3>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      {/* Por categoria */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, total]) => {
            const label = EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
            return (
              <Badge key={cat} variant="outline" className="text-xs">
                {label}: {formatCurrency(total)}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma despesa registrada no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fixa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(parseISO(e.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label ?? e.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm">{e.description}</p>
                      {e.notes && <p className="text-xs text-muted-foreground truncate">{e.notes}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{e.recurrent ? '✓ Fixa' : '—'}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(Number(e.amount))}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingId(e.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog nova despesa */}
      <Dialog open={showDialog} onOpenChange={v => !v && setShowDialog(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'pending' | 'paid' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Já paga</SelectItem>
                    <SelectItem value="pending">A pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input autoFocus value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Aluguel mês de maio" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="font-mono" />
              </div>
              <div>
                <Label>{form.status === 'paid' ? 'Data Pagamento' : 'Data Emissão'}</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            {/* Campo plano de contas */}
            <div>
              <Label className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Plano de Contas
              </Label>
              <Select value={form.chart_account_id} onValueChange={v => setForm(f => ({ ...f, chart_account_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº Documento</Label>
              <Input value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} placeholder="NF, boleto..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas opcionais..." />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Despesa Fixa</Label>
                <p className="text-xs text-muted-foreground">Recorrente todo mês</p>
              </div>
              <Switch checked={form.recurrent} onCheckedChange={v => setForm(f => ({ ...f, recurrent: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão — usa ConfirmDeleteDialog centralizado */}
      <ConfirmDeleteDialog
        open={!!deletingId}
        onOpenChange={v => !v && setDeletingId(null)}
        title="Remover despesa?"
        confirmLabel="Remover"
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId, { onSuccess: () => setDeletingId(null) })}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Aba: DRE Simplificado

function DRETab({ start, end }: { start: Date; end: Date }) {
  const { summary } = useFinancialReport(start, end);
  const { expenses } = useExpenses(start, end);

  // Agrupa despesas por categoria para o DRE
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  // CMV = insumos (matéria-prima)
  const cmv = byCategory['insumos'] || 0;
  const despesasOp = totalExpenses - cmv;

  const receitaLiquida = summary.gross_revenue - summary.discount_total;
  const lucroBruto = receitaLiquida - cmv;
  const resultadoOp = lucroBruto - despesasOp;
  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
  const margemLiquida = receitaLiquida > 0 ? (resultadoOp / receitaLiquida) * 100 : 0;

  // Linha do DRE
  const DRELine = ({ label, value, indent = false, bold = false, positive = true, separator = false }: {
    label: string; value: number; indent?: boolean; bold?: boolean; positive?: boolean; separator?: boolean;
  }) => (
    <>
      {separator && <tr><td colSpan={3}><Separator className="my-1" /></td></tr>}
      <tr className={cn(bold ? 'font-bold' : '', 'text-sm')}>
        <td className={cn('py-1.5', indent ? 'pl-6' : 'pl-0')}>
          {!positive && value !== 0 && <span className="text-muted-foreground mr-1">(-)</span>}
          {positive && value !== 0 && label.startsWith('(=)') && <span className="text-muted-foreground mr-1"></span>}
          {label.replace(/^\([=+-]\)\s*/, '')}
        </td>
        <td className="py-1.5 text-right font-mono w-32">
          {value !== 0 && !positive && <span className="text-red-500">({formatCurrency(value)})</span>}
          {(value === 0 || positive) && <span className={value < 0 ? 'text-red-500' : ''}>{formatCurrency(value)}</span>}
        </td>
        <td className="py-1.5 text-right text-muted-foreground text-xs w-20">
          {receitaLiquida > 0 && value !== 0 ? `${((Math.abs(value) / receitaLiquida) * 100).toFixed(1)}%` : ''}
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Margens resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Receita Líquida" value={formatCurrency(receitaLiquida)} icon={DollarSign} />
        <Card className={cn(lucroBruto >= 0 ? 'border-blue-200' : 'border-red-200')}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Margem Bruta</p>
            <p className={cn('text-2xl font-bold', lucroBruto >= 0 ? 'text-blue-600' : 'text-red-600')}>
              {margemBruta.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{formatCurrency(lucroBruto)}</p>
          </CardContent>
        </Card>
        <Card className={cn(resultadoOp >= 0 ? 'border-green-200' : 'border-red-200')}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Margem Líquida</p>
            <p className={cn('text-2xl font-bold', resultadoOp >= 0 ? 'text-green-600' : 'text-red-600')}>
              {margemLiquida.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{formatCurrency(resultadoOp)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela DRE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> DRE Simplificado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="pb-2 text-left font-medium">Descrição</th>
                <th className="pb-2 text-right font-medium">Valor</th>
                <th className="pb-2 text-right font-medium">% Receita</th>
              </tr>
            </thead>
            <tbody>
              <DRELine label="Receita Bruta" value={summary.gross_revenue} positive bold />
              <DRELine label="(-) Descontos Concedidos" value={summary.discount_total} positive={false} indent />
              <DRELine label="(=) Receita Líquida" value={receitaLiquida} positive bold separator />
              <DRELine label="(-) CMV — Insumos/Matéria-Prima" value={cmv} positive={false} indent />
              <DRELine label="(=) Lucro Bruto" value={lucroBruto} positive bold separator />
              {/* Despesas operacionais por categoria */}
              {Object.entries(byCategory).filter(([cat]) => cat !== 'insumos').sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                <DRELine key={cat} label={`(-) ${EXPENSE_CATEGORIES.find(c => c.value === cat)?.label ?? cat}`}
                  value={total} positive={false} indent />
              ))}
              <DRELine label="(-) Total Despesas Operacionais" value={despesasOp} positive={false} bold />
              <DRELine label="(=) Resultado Operacional" value={resultadoOp} positive={resultadoOp >= 0} bold separator />
            </tbody>
          </table>

          {expenses.length === 0 && summary.gross_revenue === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum dado no período selecionado.</p>
          )}
        </CardContent>
      </Card>

      {/* Observação */}
      <p className="text-xs text-muted-foreground">
        * DRE baseado nos dados lançados no sistema. CMV considera apenas despesas da categoria "Insumos / Matéria-Prima".
        Despesas sem data no período não são incluídas.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Página principal

export default function Financeiro() {
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { start, end } = getPeriodDates(period, customStart, customEnd);
  const { summary } = useFinancialReport(start, end);

  // Label legível do período para o relatório WhatsApp
  const periodLabel = start.toDateString() === end.toDateString()
    ? format(start, "dd/MM/yyyy", { locale: ptBR })
    : `${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(start, "dd 'de' MMMM", { locale: ptBR })}
            {start.toDateString() !== end.toDateString() && (
              <> — {format(end, "dd 'de' MMMM", { locale: ptBR })}</>
            )}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <BarChart2 className="w-3 h-3 mr-1" /> PDV + Online
        </Badge>
      </div>

      <PeriodSelector period={period} setPeriod={setPeriod}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd} />

      <Tabs defaultValue="relatorios">
        <TabsList>
          <TabsTrigger value="relatorios">Relatórios de Vendas</TabsTrigger>
          <TabsTrigger value="contas-pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="relatorios" className="mt-6">
          <RelatoriosTab start={start} end={end} periodLabel={periodLabel} />
        </TabsContent>

        <TabsContent value="contas-pagar" className="mt-6">
          <ContasAPagarTab />
        </TabsContent>

        <TabsContent value="despesas" className="mt-6">
          <DespesasTab start={start} end={end} grossRevenue={summary.gross_revenue} />
        </TabsContent>

        <TabsContent value="dre" className="mt-6">
          <DRETab start={start} end={end} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

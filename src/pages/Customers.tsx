// v2.2.0 — Clientes: usa status-helpers, useWhatsAppSend, ConfirmDeleteDialog centralizados
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useWhatsAppSend } from "@/hooks/useWhatsAppSend";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { getARStatus, AR_ROW_CLASS, AR_BADGE } from "@/lib/status-helpers";
import { formatDateBR } from "@/lib/date-formatter";
import {
  Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Calendar,
  ShoppingBag, Home, Building2, History, Wallet, MessageSquare,
  DollarSign, AlertTriangle, CheckCircle2, Loader2, X, BookOpen,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CustomerOrderHistory } from "@/components/customers/CustomerOrderHistory";
import { formatCurrency } from "@/lib/currency-formatter";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────
// Tipos

interface CustomerAddress {
  label: string; is_default: boolean; address: string; address_number: string;
  address_complement?: string; neighborhood: string; city: string; state: string; zip_code?: string;
}

interface Customer {
  id: string; company_id: string; name: string; phone: string; email?: string;
  addresses: CustomerAddress[]; notes?: string; last_order_id?: string;
  last_order_data?: any; last_order_at?: string; total_orders?: number;
  created_at?: string; credit_balance?: number; credit_limit?: number;
}

interface AccountReceivable {
  id: string; customer_id: string; customer_name: string; description: string;
  amount: number; due_date: string; paid_at: string | null; paid_amount: number | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'; notes: string | null; created_at: string;
}

interface CreditHistoryEntry {
  id: string; type: 'credit' | 'debit'; amount: number; balance_after: number;
  description: string; reference_type: string | null; created_at: string;
}

interface ChartAccount {
  id: string; code: string; name: string;
}

// getARStatus, AR_ROW_CLASS, AR_BADGE → importados de @/lib/status-helpers

const emptyAddress: CustomerAddress = {
  label: 'Casa', is_default: true, address: '', address_number: '',
  address_complement: '', neighborhood: '', city: '', state: '', zip_code: '',
};

// ────────────────────────────────────────────────────────────
// Componente: Aba Financeiro do cliente

function CustomerFinanceiroTab({ customer, companyId }: { customer: Customer; companyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { send: sendWhatsApp } = useWhatsAppSend(); // Evolution API + fallback wa.me
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'paid' | 'today'>('all');
  const [showAddAR, setShowAddAR] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState<AccountReceivable | null>(null);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [arForm, setArForm] = useState({ description: '', amount: '', due_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
  const [creditForm, setCreditForm] = useState({ amount: '', description: '' });
  const [sendingWA, setSendingWA] = useState<string | null>(null);

  // Contas a receber do cliente
  const { data: receivables = [], isLoading: loadingAR } = useQuery<AccountReceivable[]>({
    queryKey: ['ar-customer', customer.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts_receivable').select('*')
        .eq('customer_id', customer.id).order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Histórico de crédito
  const { data: creditHistory = [] } = useQuery<CreditHistoryEntry[]>({
    queryKey: ['credit-history', customer.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_credit_history').select('*')
        .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  // Adicionar conta a receber
  const addARMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(arForm.amount.replace(',', '.'));
      if (!amount || amount <= 0) throw new Error('Valor inválido');
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('accounts_receivable').insert({
        company_id: companyId, customer_id: customer.id, customer_name: customer.name,
        description: arForm.description.trim(), amount, due_date: arForm.due_date,
        notes: arForm.notes || null, status: 'pending', created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-customer', customer.id] });
      toast({ title: 'Conta a receber registrada' });
      setShowAddAR(false);
      setArForm({ description: '', amount: '', due_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Baixar pagamento de AR com plano de contas opcional
  const payARMutation = useMutation({
    mutationFn: async ({ ar, paidAmount, chartAccountId, paidAt }: {
      ar: AccountReceivable; paidAmount: number; chartAccountId?: string; paidAt?: string;
    }) => {
      const { error } = await supabase.from('accounts_receivable').update({
        status: 'paid',
        paid_at: paidAt || format(new Date(), 'yyyy-MM-dd'),
        paid_amount: paidAmount,
        chart_account_id: chartAccountId || null,
      }).eq('id', ar.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-customer', customer.id] });
      toast({ title: 'Pagamento registrado' });
      setShowPayDialog(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Adicionar crédito manual ao cliente
  const addCreditMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(creditForm.amount.replace(',', '.'));
      if (!amount || amount <= 0) throw new Error('Valor inválido');
      const currentBalance = customer.credit_balance || 0;
      const newBalance = currentBalance + amount;
      const { data: user } = await supabase.auth.getUser();

      await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', customer.id);
      await supabase.from('customer_credit_history').insert({
        company_id: companyId, customer_id: customer.id, type: 'credit',
        amount, balance_after: newBalance,
        description: creditForm.description || 'Crédito adicionado manualmente',
        reference_type: 'manual', created_by: user.user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['credit-history', customer.id] });
      toast({ title: 'Crédito adicionado' });
      setShowAddCredit(false);
      setCreditForm({ amount: '', description: '' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Enviar cobrança WhatsApp — usa useWhatsAppSend (Evolution + fallback wa.me)
  const sendWhatsAppCharge = async (ar: AccountReceivable) => {
    setSendingWA(ar.id);
    const message = [
      `Olá ${customer.name}! 👋`,
      ``,
      `Passando para lembrar sobre o pagamento pendente:`,
      ``,
      `📋 *${ar.description}*`,
      `💰 Valor: *${formatCurrency(ar.amount)}*`,
      `📅 Vencimento: *${formatDateBR(ar.due_date)}*`,
      ``,
      `Qualquer dúvida, estamos à disposição! 😊`,
    ].join('\n');
    await sendWhatsApp({ phone: customer.phone, message });
    setSendingWA(null);
  };

  // Filtrar AR
  const filtered = receivables.filter(ar => {
    if (statusFilter === 'all') return true;
    return getARStatus(ar) === statusFilter;
  });

  const totalPending = receivables.filter(ar => ar.status !== 'paid' && ar.status !== 'cancelled')
    .reduce((s, ar) => s + Number(ar.amount), 0);
  const totalOverdue = receivables.filter(ar => getARStatus(ar) === 'overdue')
    .reduce((s, ar) => s + Number(ar.amount), 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Saldo de Crédito</p>
          <p className={cn('text-xl font-bold', (customer.credit_balance || 0) > 0 ? 'text-green-600' : 'text-muted-foreground')}>
            {formatCurrency(customer.credit_balance || 0)}
          </p>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setShowAddCredit(true)}>
            <Plus className="w-3 h-3 mr-1" />Adicionar Crédito
          </Button>
        </div>
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-muted-foreground">{receivables.filter(ar => ar.status === 'pending').length} conta(s)</p>
        </div>
        <div className="rounded-lg border border-red-200 p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Vencidas</p>
          <p className={cn('text-xl font-bold', totalOverdue > 0 ? 'text-red-600' : 'text-muted-foreground')}>
            {formatCurrency(totalOverdue)}
          </p>
          {totalOverdue > 0 && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Atenção</p>}
        </div>
      </div>

      {/* Contas a Receber */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Contas a Receber</h4>
          <Button size="sm" onClick={() => setShowAddAR(true)}>
            <Plus className="w-3 h-3 mr-1" />Nova Conta
          </Button>
        </div>

        {/* Filtros por status com cores */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all', label: `Todas (${receivables.length})`, cls: '' },
            { key: 'overdue', label: `Vencidas (${receivables.filter(ar => getARStatus(ar) === 'overdue').length})`, cls: 'text-red-600 border-red-300' },
            { key: 'today', label: `Hoje (${receivables.filter(ar => getARStatus(ar) === 'today').length})`, cls: 'text-blue-600 border-blue-300' },
            { key: 'pending', label: `A Vencer (${receivables.filter(ar => getARStatus(ar) === 'pending').length})`, cls: 'text-gray-600' },
            { key: 'paid', label: `Pagas (${receivables.filter(ar => ar.status === 'paid').length})`, cls: 'text-green-600 border-green-300' },
          ] as const).map(f => (
            <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm"
              className={cn('text-xs', statusFilter !== f.key && f.cls)}
              onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>

        {loadingAR ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conta encontrada.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(ar => {
              const st = getARStatus(ar);
              const badge = AR_BADGE[st];
              return (
                <div key={ar.id} className={cn('rounded-lg p-3 flex items-start justify-between gap-2', AR_ROW_CLASS[st])}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{ar.description}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badge.class)}>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono font-medium text-foreground">{formatCurrency(ar.amount)}</span>
                      <span>Venc: {format(parseISO(ar.due_date), 'dd/MM/yyyy')}</span>
                      {ar.paid_at && <span className="text-green-600">Pago: {format(parseISO(ar.paid_at), 'dd/MM/yyyy')}</span>}
                    </div>
                    {ar.notes && <p className="text-xs text-muted-foreground mt-0.5">{ar.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* WhatsApp cobrança (apenas pendentes/vencidas) */}
                    {ar.status !== 'paid' && ar.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                        title="Enviar cobrança WhatsApp"
                        onClick={() => sendWhatsAppCharge(ar)}
                        disabled={sendingWA === ar.id}>
                        {sendingWA === ar.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <MessageSquare className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    {ar.status !== 'paid' && ar.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                        title="Registrar pagamento"
                        onClick={() => setShowPayDialog(ar)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico de Crédito */}
      {creditHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Histórico de Saldo</h4>
          <ScrollArea className="h-40">
            <div className="space-y-1.5">
              {creditHistory.map(h => (
                <div key={h.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{h.description}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(h.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('font-mono font-medium text-sm', h.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {h.type === 'credit' ? '+' : '-'}{formatCurrency(h.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Saldo: {formatCurrency(h.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Dialog: Nova conta a receber */}
      <Dialog open={showAddAR} onOpenChange={v => !v && setShowAddAR(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Descrição *</Label>
              <Input autoFocus value={arForm.description} onChange={e => setArForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Venda a prazo 10/05" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$) *</Label>
                <Input value={arForm.amount} onChange={e => setArForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="font-mono" /></div>
              <div><Label>Vencimento</Label>
                <Input type="date" value={arForm.due_date} onChange={e => setArForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label>
              <Textarea value={arForm.notes} onChange={e => setArForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAR(false)}>Cancelar</Button>
            <Button onClick={() => addARMutation.mutate()} disabled={addARMutation.isPending}>
              {addARMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar pagamento de AR (com plano de contas) */}
      {showPayDialog && (
        <PayARDialog ar={showPayDialog} companyId={companyId} onClose={() => setShowPayDialog(null)}
          onPay={(amount, chartAccountId, paidAt) =>
            payARMutation.mutate({ ar: showPayDialog, paidAmount: amount, chartAccountId, paidAt })}
          isPaying={payARMutation.isPending} />
      )}

      {/* Dialog: Adicionar crédito manual */}
      <Dialog open={showAddCredit} onOpenChange={v => !v && setShowAddCredit(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Crédito ao Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Valor (R$) *</Label>
              <Input autoFocus value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="font-mono" /></div>
            <div><Label>Motivo</Label>
              <Input value={creditForm.description} onChange={e => setCreditForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Devolução, cortesia..." /></div>
            <p className="text-xs text-muted-foreground">Saldo atual: {formatCurrency(customer.credit_balance || 0)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCredit(false)}>Cancelar</Button>
            <Button onClick={() => addCreditMutation.mutate()} disabled={addCreditMutation.isPending}>
              {addCreditMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Dialog para registrar pagamento de AR com plano de contas
function PayARDialog({ ar, companyId, onClose, onPay, isPaying }: {
  ar: AccountReceivable; companyId: string; onClose: () => void;
  onPay: (amount: number, chartAccountId?: string, paidAt?: string) => void;
  isPaying: boolean;
}) {
  const [amount, setAmount] = useState(ar.amount.toFixed(2).replace('.', ','));
  const [chartAccountId, setChartAccountId] = useState('');
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Busca plano de contas da empresa
  const { data: accounts = [] } = useQuery<ChartAccount[]>({
    queryKey: ['chart-accounts', companyId],
    queryFn: async () => {
      const { data } = await supabase.from('chart_of_accounts').select('id,code,name')
        .eq('company_id', companyId).eq('is_active', true).order('code');
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="font-medium text-sm">{ar.description}</p>
            <p className="text-xs text-muted-foreground">Valor original: {formatCurrency(ar.amount)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Recebido (R$)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} className="font-mono text-lg" autoFocus />
            </div>
            <div>
              <Label>Data do Pagamento</Label>
              <Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
            </div>
          </div>
          {/* Plano de Contas */}
          <div>
            <Label className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Plano de Contas
            </Label>
            <Select value={chartAccountId} onValueChange={setChartAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta (opcional)" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700"
            onClick={() => onPay(parseFloat(amount.replace(',', '.')) || ar.amount, chartAccountId || undefined, paidAt)}
            disabled={isPaying}>
            {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="w-4 h-4 mr-2" />Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────
// Página principal de Clientes

export function Customers() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [addresses, setAddresses] = useState<CustomerAddress[]>([{ ...emptyAddress }]);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { companyId } = useCompanyId();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('customers').select('*')
        .eq('company_id', companyId).order('name');
      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        addresses: Array.isArray(c.addresses) ? (c.addresses as unknown as CustomerAddress[]) : [],
      })) as unknown as Customer[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID não encontrado');
      const cleanedAddresses = addresses.filter(a => a.address || a.neighborhood);
      if (cleanedAddresses.length > 0 && !cleanedAddresses.some(a => a.is_default)) cleanedAddresses[0].is_default = true;
      const payload = {
        name: formData.name, phone: formData.phone,
        email: formData.email || null, notes: formData.notes || null,
        addresses: cleanedAddresses as unknown as Json,
      };
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([{ ...payload, company_id: companyId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast({ title: editingCustomer ? 'Cliente atualizado' : 'Cliente cadastrado' });
      closeModal();
    },
    onError: (e: any) => toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast({ title: 'Cliente excluído' });
      setDeletingCustomer(null);
    },
    onError: (e: any) => toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }),
  });

  const openModal = (customer?: Customer) => {
    setEditingCustomer(customer ?? null);
    if (customer) {
      setFormData({ name: customer.name, phone: customer.phone, email: customer.email || '', notes: customer.notes || '' });
      setAddresses(customer.addresses?.length > 0 ? customer.addresses : [{ ...emptyAddress }]);
    } else {
      setFormData({ name: '', phone: '', email: '', notes: '' });
      setAddresses([{ ...emptyAddress }]);
    }
    setEditingAddressIndex(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', notes: '' });
    setAddresses([{ ...emptyAddress }]);
    setEditingAddressIndex(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast({ title: 'Nome e telefone obrigatórios', variant: 'destructive' }); return;
    }
    saveMutation.mutate();
  };

  const updateAddress = (index: number, field: keyof CustomerAddress, value: string | boolean) => {
    setAddresses(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSetDefault = (index: number) => {
    setAddresses(prev => prev.map((a, i) => ({ ...a, is_default: i === index })));
  };

  const handleAddAddress = () => {
    setAddresses(prev => [...prev, { ...emptyAddress, label: `Endereço ${prev.length + 1}`, is_default: prev.length === 0 }]);
    setEditingAddressIndex(addresses.length);
  };

  const handleRemoveAddress = (index: number) => {
    const next = addresses.filter((_, i) => i !== index);
    if (addresses[index].is_default && next.length > 0) next[0].is_default = true;
    setAddresses(next);
    setEditingAddressIndex(null);
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAddress = (c: Customer) => {
    const addr = (c.addresses || []).find(a => a.is_default) || c.addresses?.[0];
    if (!addr) return '—';
    const parts = [addr.address, addr.address_number].filter(Boolean).join(', ');
    return `${parts}${addr.neighborhood ? ` - ${addr.neighborhood}` : ''}${addr.city ? `, ${addr.city}` : ''}` || '—';
  };

  return (
    <PageLayout title="Clientes"
      actions={isAdmin ? (
        <Button onClick={() => openModal()}><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
      ) : undefined}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone ou email..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Último Pedido</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      {c.email && isAdmin && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{c.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_order_at ? format(new Date(c.last_order_at), 'dd/MM/yy', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell className="text-center">{c.total_orders || 0}</TableCell>
                    <TableCell className="text-right">
                      {(c.credit_balance || 0) > 0
                        ? <span className="text-green-600 font-medium text-sm">{formatCurrency(c.credit_balance!)}</span>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Histórico de pedidos" onClick={() => setHistoryCustomer(c)}>
                          <History className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => openModal(c)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingCustomer(c)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sidebar histórico pedidos */}
      {historyCustomer && companyId && (
        <CustomerOrderHistory open={!!historyCustomer} onClose={() => setHistoryCustomer(null)}
          customerName={historyCustomer.name} customerPhone={historyCustomer.phone} companyId={companyId} />
      )}

      {/* Delete confirm — usa ConfirmDeleteDialog centralizado */}
      <ConfirmDeleteDialog
        open={!!deletingCustomer}
        onOpenChange={v => !v && setDeletingCustomer(null)}
        title="Excluir cliente?"
        description={deletingCustomer ? `${deletingCustomer.name} será removido permanentemente.` : ''}
        onConfirm={() => deletingCustomer && deleteMutation.mutate(deletingCustomer.id)}
        isPending={deleteMutation.isPending}
      />

      {/* Dialog editar/criar cliente — com Tabs */}
      <Dialog open={showModal} onOpenChange={v => !v && closeModal()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? `Editar: ${editingCustomer.name}` : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="enderecos">Endereços</TabsTrigger>
              {editingCustomer && (
                <TabsTrigger value="financeiro" className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" />Financeiro
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── Aba: Informações */}
            <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome *</Label>
                  <Input autoFocus value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="João Silva" /></div>
                <div><Label>Telefone *</Label>
                  <Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              </div>
              <div><Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" /></div>
              <div><Label>Observações</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
              {editingCustomer && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Último pedido</p>
                    <p className="font-medium text-sm">
                      {editingCustomer.last_order_at
                        ? format(new Date(editingCustomer.last_order_at), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Nunca pediu'}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total de pedidos</p>
                    <p className="font-medium text-sm">{editingCustomer.total_orders || 0}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Aba: Endereços */}
            <TabsContent value="enderecos" className="flex-1 overflow-y-auto mt-4 space-y-3">
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleAddAddress}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar Endereço
                </Button>
              </div>
              {addresses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm border border-dashed rounded-lg">Nenhum endereço</p>
              ) : (
                addresses.map((addr, index) => (
                  <div key={index} className={cn('border rounded-lg p-4 space-y-3', editingAddressIndex === index && 'border-primary bg-muted/30')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {addr.label.toLowerCase().includes('trabalho') ? <Building2 className="h-4 w-4 text-muted-foreground" /> : <Home className="h-4 w-4 text-muted-foreground" />}
                        <Input value={addr.label} onChange={e => updateAddress(index, 'label', e.target.value)} className="h-7 w-28 text-sm font-medium" />
                        {addr.is_default && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Padrão</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!addr.is_default && <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => handleSetDefault(index)}>Definir padrão</Button>}
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditingAddressIndex(editingAddressIndex === index ? null : index)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {addresses.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAddress(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </div>
                    {editingAddressIndex !== index && (addr.address || addr.neighborhood) && (
                      <p className="text-sm text-muted-foreground pl-6">
                        {[addr.address, addr.address_number].filter(Boolean).join(', ')}
                        {addr.neighborhood && ` - ${addr.neighborhood}`}
                        {addr.city && `, ${addr.city}`}{addr.state && `/${addr.state}`}
                      </p>
                    )}
                    {editingAddressIndex === index && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-[1fr_100px] gap-3">
                          <div><Label className="text-xs">Rua</Label><Input value={addr.address} onChange={e => updateAddress(index, 'address', e.target.value)} /></div>
                          <div><Label className="text-xs">Número</Label><Input value={addr.address_number} onChange={e => updateAddress(index, 'address_number', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Complemento</Label><Input value={addr.address_complement || ''} onChange={e => updateAddress(index, 'address_complement', e.target.value)} /></div>
                          <div><Label className="text-xs">Bairro</Label><Input value={addr.neighborhood} onChange={e => updateAddress(index, 'neighborhood', e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-[1fr_60px_100px] gap-3">
                          <div><Label className="text-xs">Cidade</Label><Input value={addr.city} onChange={e => updateAddress(index, 'city', e.target.value)} /></div>
                          <div><Label className="text-xs">UF</Label><Input value={addr.state} maxLength={2} onChange={e => updateAddress(index, 'state', e.target.value.toUpperCase())} /></div>
                          <div><Label className="text-xs">CEP</Label><Input value={addr.zip_code || ''} onChange={e => updateAddress(index, 'zip_code', e.target.value)} /></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* ── Aba: Financeiro */}
            {editingCustomer && companyId && (
              <TabsContent value="financeiro" className="flex-1 overflow-y-auto mt-4">
                <CustomerFinanceiroTab customer={editingCustomer} companyId={companyId} />
              </TabsContent>
            )}
          </Tabs>

          <DialogFooter className="shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCustomer ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

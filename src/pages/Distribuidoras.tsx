// v1.1.0 — Fornecedores: movido para Cadastros, renomeado
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input'; // v1.0.1 — máscara R$
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, Pencil, Trash2, Loader2, Building2, ShoppingCart,
  PackageCheck, Send, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────
// Tipos

interface Distributor {
  id: string;
  company_id: string;
  name: string;
  cnpj: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface PurchaseOrderItem {
  id?: string;
  ingredient_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  total_cost: number | null;
}

interface PurchaseOrder {
  id: string;
  company_id: string;
  distributor_id: string;
  order_number: string | null;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  total_cost: number | null;
  created_at: string;
  distributors: { name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
}

// ────────────────────────────────────────────────────────────
// Helpers

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  ordered: 'Enviado',
  received: 'Recebido',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[status] ?? 'bg-muted')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const emptyDistributor = (): Partial<Distributor> => ({
  name: '', cnpj: '', contact_name: '', phone: '', email: '', notes: '', is_active: true,
});

// ────────────────────────────────────────────────────────────
// Aba: Fornecedores

function FornecedoresTab() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [deleting, setDeleting] = useState<Distributor | null>(null);
  const [form, setForm] = useState<Partial<Distributor>>(emptyDistributor());

  const { data: distributors = [], isLoading } = useQuery<Distributor[]>({
    queryKey: ['distributors', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('distributors').select('*')
        .eq('company_id', companyId).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Distributor>) => {
      if (!companyId) throw new Error('Company ID não encontrado');
      const payload = { name: data.name!, cnpj: data.cnpj || null, contact_name: data.contact_name || null, phone: data.phone || null, email: data.email || null, notes: data.notes || null, is_active: data.is_active ?? true };
      if (editing) {
        const { error } = await supabase.from('distributors').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('distributors').insert({ ...payload, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors', companyId] });
      toast({ title: editing ? 'Fornecedor atualizado' : 'Fornecedor cadastrado' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('distributors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distributors', companyId] });
      toast({ title: 'Fornecedor removido' });
      setDeleting(null);
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const openDialog = (d?: Distributor) => { setEditing(d ?? null); setForm(d ? { ...d } : emptyDistributor()); setShowDialog(true); };
  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyDistributor()); };

  const handleSave = () => {
    if (!form.name?.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog()}><Plus className="w-4 h-4 mr-2" />Novo Fornecedor</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : distributors.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum fornecedor cadastrado.</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributors.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{d.cnpj || '—'}</TableCell>
                <TableCell className="text-sm">{d.contact_name || '—'}</TableCell>
                <TableCell className="text-sm">{d.phone || '—'}</TableCell>
                <TableCell className="text-sm">{d.email || '—'}</TableCell>
                <TableCell>
                  <Badge variant={d.is_active ? 'default' : 'secondary'}>{d.is_active ? 'Ativo' : 'Inativo'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog fornecedor */}
      <Dialog open={showDialog} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome *</Label>
              <Input autoFocus value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Distribuidora ABC" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ</Label><Input value={form.cnpj ?? ''} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" className="font-mono" /></div>
              <div><Label>Contato</Label><Input value={form.contact_name ?? ''} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={v => !v && setDeleting(null)}
        title="Remover fornecedor?"
        description={`"${deleting?.name}" será removido. Pedidos existentes não serão afetados.`}
        confirmLabel="Remover"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Aba: Pedidos de Compra

function PedidosTab() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form estado do novo pedido
  const [orderForm, setOrderForm] = useState({ distributor_id: '', order_number: '', notes: '' });
  const [items, setItems] = useState<PurchaseOrderItem[]>([{ ingredient_id: null, description: '', quantity: 1, unit: 'kg', unit_cost: null, total_cost: null }]);

  const { data: distributors = [] } = useQuery<Distributor[]>({
    queryKey: ['distributors', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('distributors').select('id,name').eq('company_id', companyId).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: ingredients = [] } = useQuery<Ingredient[]>({
    queryKey: ['ingredients-names', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await (supabase as any).from('ingredients').select('id,name,unit').eq('company_id', companyId).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.from('purchase_orders')
        .select('*, distributors(name), purchase_order_items(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PurchaseOrder[];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID não encontrado');
      if (!orderForm.distributor_id) throw new Error('Selecione um fornecedor');

      const { data: user } = await supabase.auth.getUser();
      const validItems = items.filter(i => i.description.trim() && i.quantity > 0);
      if (validItems.length === 0) throw new Error('Adicione pelo menos um item');

      const totalCost = validItems.reduce((s, i) => s + (i.total_cost || 0), 0);

      const { data: order, error: orderErr } = await supabase.from('purchase_orders')
        .insert({ company_id: companyId, distributor_id: orderForm.distributor_id, order_number: orderForm.order_number || null, notes: orderForm.notes || null, total_cost: totalCost || null, created_by: user.user?.id })
        .select().single();
      if (orderErr) throw orderErr;

      const itemsPayload = validItems.map(i => ({
        purchase_order_id: order.id,
        ingredient_id: i.ingredient_id || null,
        description: i.description.trim(),
        quantity: i.quantity,
        unit: i.unit,
        unit_cost: i.unit_cost || null,
        total_cost: i.total_cost || null,
      }));

      const { error: itemsErr } = await supabase.from('purchase_order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', companyId] });
      toast({ title: 'Pedido criado' });
      resetNewOrder();
    },
    onError: (e: any) => toast({ title: 'Erro ao criar pedido', description: e.message, variant: 'destructive' }),
  });

  // Transição de status
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === 'ordered') updates.ordered_at = new Date().toISOString();
      if (status === 'received') updates.received_at = new Date().toISOString();
      const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: async ({ id, status }) => {
      // Se recebido: cria stock_movements para cada item com ingredient_id
      if (status === 'received') {
        const order = orders.find(o => o.id === id);
        const ingItems = order?.purchase_order_items?.filter(i => i.ingredient_id) || [];

        if (ingItems.length > 0) {
          // Atualiza estoque de cada ingrediente
          for (const item of ingItems) {
            const { data: ing } = await (supabase as any).from('ingredients').select('stock').eq('id', item.ingredient_id).single();
            const newStock = (ing?.stock || 0) + Number(item.quantity);
            await (supabase as any).from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.ingredient_id);
            await (supabase as any).from('stock_movements').insert({
              company_id: companyId,
              ingredient_id: item.ingredient_id,
              type: 'in',
              quantity: item.quantity,
              reason: `Recebimento pedido #${order?.order_number || order?.id.slice(0, 8)}`,
            });
          }
          toast({ title: `Pedido recebido — estoque atualizado para ${ingItems.length} ingrediente(s)` });
        } else {
          toast({ title: 'Pedido marcado como recebido' });
        }
      } else {
        toast({ title: 'Status atualizado' });
      }
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', companyId] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', companyId] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const resetNewOrder = () => {
    setShowNewOrder(false);
    setOrderForm({ distributor_id: '', order_number: '', notes: '' });
    setItems([{ ingredient_id: null, description: '', quantity: 1, unit: 'kg', unit_cost: null, total_cost: null }]);
  };

  const updateItem = (idx: number, patch: Partial<PurchaseOrderItem>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...patch };
      // Recalcula total do item
      if (updated.quantity && updated.unit_cost) {
        updated.total_cost = +(updated.quantity * updated.unit_cost).toFixed(2);
      }
      return updated;
    }));
  };

  const addItemRow = () => setItems(prev => [...prev, { ingredient_id: null, description: '', quantity: 1, unit: 'kg', unit_cost: null, total_cost: null }]);
  const removeItemRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const selectIngredient = (idx: number, ingId: string) => {
    const ing = ingredients.find(i => i.id === ingId);
    if (ing) updateItem(idx, { ingredient_id: ingId, description: ing.name, unit: ing.unit });
  };

  const formTotal = items.reduce((s, i) => s + (i.total_cost || 0), 0);

  const filtered = orders.filter(o => statusFilter === 'all' || o.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filtros de status */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'draft', 'ordered', 'received', 'cancelled'] as const).map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
              onClick={() => setStatusFilter(s)}>
              {s === 'all' ? `Todos (${orders.length})` : `${STATUS_LABELS[s]} (${orders.filter(o => o.status === s).length})`}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowNewOrder(true)}><Plus className="w-4 h-4 mr-2" />Novo Pedido</Button>
      </div>

      {/* Formulário novo pedido */}
      {showNewOrder && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Novo Pedido de Compra</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetNewOrder}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label>Fornecedor *</Label>
                <Select value={orderForm.distributor_id} onValueChange={v => setOrderForm(f => ({ ...f, distributor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {distributors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nº do Pedido</Label>
                <Input value={orderForm.order_number} onChange={e => setOrderForm(f => ({ ...f, order_number: e.target.value }))} placeholder="Ex: PED-001" className="font-mono" />
              </div>
            </div>

            {/* Itens */}
            <div>
              <Label className="mb-2 block">Itens do Pedido</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    {/* Ingrediente (opcional) */}
                    <div className="col-span-3">
                      <Select value={item.ingredient_id ?? 'none'} onValueChange={v => v === 'none' ? updateItem(idx, { ingredient_id: null }) : selectIngredient(idx, v)}>
                        <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Ingrediente" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Livre —</SelectItem>
                          {ingredients.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Descrição */}
                    <div className="col-span-3">
                      <Input className="h-8 text-xs" placeholder="Descrição *" value={item.description}
                        onChange={e => updateItem(idx, { description: e.target.value })} />
                    </div>
                    {/* Qtd */}
                    <div className="col-span-2">
                      <Input className="h-8 text-xs font-mono" type="number" min="0.001" step="0.001" placeholder="Qtd" value={item.quantity}
                        onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                    </div>
                    {/* Unidade */}
                    <div className="col-span-1">
                      <Input className="h-8 text-xs" placeholder="Un" value={item.unit}
                        onChange={e => updateItem(idx, { unit: e.target.value })} />
                    </div>
                    {/* Custo unit — máscara R$ */}
                    <div className="col-span-2">
                      <CurrencyInput className="h-8 text-xs font-mono" placeholder="R$/un"
                        value={item.unit_cost ?? 0} onChange={(n) => updateItem(idx, { unit_cost: n > 0 ? n : null })} />
                    </div>
                    {/* Total */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {item.total_cost ? formatCurrency(item.total_cost) : '—'}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeItemRow(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <Button variant="outline" size="sm" onClick={addItemRow}>
                  <Plus className="w-3 h-3 mr-1" />Adicionar Item
                </Button>
                {formTotal > 0 && (
                  <span className="text-sm font-medium">Total: {formatCurrency(formTotal)}</span>
                )}
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetNewOrder}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum pedido encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id} className={cn(order.status === 'received' && 'opacity-80')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{order.distributors?.name ?? '—'}</span>
                      {order.order_number && (
                        <span className="text-xs text-muted-foreground font-mono">#{order.order_number}</span>
                      )}
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {format(parseISO(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {order.received_at && ` · Recebido em ${format(parseISO(order.received_at), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </p>
                    {order.total_cost && (
                      <p className="text-sm font-medium mt-1">Total: {formatCurrency(order.total_cost)}</p>
                    )}
                  </div>

                  {/* Ações de status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {order.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: order.id, status: 'ordered' })}
                        disabled={statusMutation.isPending}>
                        <Send className="w-3.5 h-3.5 mr-1" />Enviar ao Fornecedor
                      </Button>
                    )}
                    {order.status === 'ordered' && (
                      <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: 'received' })}
                        disabled={statusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700">
                        <PackageCheck className="w-3.5 h-3.5 mr-1" />Confirmar Recebimento
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Itens expandidos */}
                {expandedId === order.id && order.purchase_order_items && order.purchase_order_items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">ITENS DO PEDIDO</p>
                    <div className="space-y-1">
                      {order.purchase_order_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span className="flex-1">{item.description}</span>
                          <span className="text-muted-foreground mx-4 font-mono text-xs">
                            {item.quantity} {item.unit}
                          </span>
                          {item.total_cost && (
                            <span className="font-medium font-mono text-xs">{formatCurrency(item.total_cost)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {order.notes && (
                      <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">Obs: {order.notes}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Página principal

export default function Distribuidoras() {
  return (
    <PageLayout title="Fornecedores" subtitle="Cadastro de fornecedores e pedidos de compra">
      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos">
            <ShoppingCart className="w-4 h-4 mr-2" />Pedidos de Compra
          </TabsTrigger>
          <TabsTrigger value="fornecedores">
            <Building2 className="w-4 h-4 mr-2" />Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="mt-6">
          <PedidosTab />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-6">
          <FornecedoresTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

# Tasks Frontend Ana Food - Implementação Detalhada

## Status Geral
- [x] Backend APIs implementadas
- [ ] Frontend components (6 tasks)

---

## Task 1: Filtro Archived no Kanban ⏱️ 10min
**Arquivo**: `/src/components/orders/OrdersKanban.tsx`
**Linha**: 66-82

**Mudança**:
```tsx
// ANTES (linha 72)
const response: any = await apiClient.getOrders(companyId);

// DEPOIS
const response: any = await apiClient.getOrders(companyId);
// Filtra archived no frontend (fallback se backend não filtrar)
return (response.data as Order[])
  .filter(order => order.status !== 'archived')
  .map(order => ({
    ...order,
    status: normalizeStatus(order.status) as any
  }));
```

**Arquivo adicional**: `/src/lib/api-client.ts`
Adicionar parâmetro `?status=neq.archived` na query orders.

---

## Task 2: Botões Header Robô + Mensagens Status ⏱️ 30min
**Arquivo**: `/src/pages/Orders.tsx`
**Linhas**: 90-97

**Adicionar após botão "Loja Aberta"**:
```tsx
import { Bot, MessageSquare, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

// Dentro do component Orders():
const [robotEnabled, setRobotEnabled] = useState(true);
const [statusMessagesEnabled, setStatusMessagesEnabled] = useState(true);

// Query settings WhatsApp
const { data: whatsappSettings } = useQuery({
  queryKey: ["whatsapp-settings", companyId],
  queryFn: async () => {
    const res = await fetch(`/v1/settings/${companyId}/whatsapp`);
    return res.json();
  },
  enabled: !!companyId,
  onSuccess: (data) => {
    setRobotEnabled(data.robot_enabled);
    setStatusMessagesEnabled(data.status_messages_enabled);
  }
});

// Mutation toggle
const toggleWhatsappMutation = useMutation({
  mutationFn: async (updates: {robot_enabled?: boolean, status_messages_enabled?: boolean}) => {
    const res = await fetch(`/v1/settings/${companyId}/whatsapp`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  onSuccess: () => {
    toast({title: "Configuração atualizada"});
  }
});

// JSX botões (inserir linha 96):
<Button
  variant={robotEnabled ? "default" : "outline"}
  size="sm"
  onClick={() => {
    toggleWhatsappMutation.mutate({robot_enabled: !robotEnabled});
    setRobotEnabled(!robotEnabled);
  }}
>
  <Bot className="w-4 h-4 mr-2" />
  Robô {robotEnabled ? "Ativo" : "Inativo"}
</Button>

<Button
  variant={statusMessagesEnabled ? "default" : "outline"}
  size="sm"
  onClick={() => {
    toggleWhatsappMutation.mutate({status_messages_enabled: !statusMessagesEnabled});
    setStatusMessagesEnabled(!statusMessagesEnabled);
  }}
>
  <MessageSquare className="w-4 h-4 mr-2" />
  Msgs Status {statusMessagesEnabled ? "ON" : "OFF"}
</Button>

<Button
  variant="ghost"
  size="sm"
  onClick={() => window.location.href = '/settings#horarios'}
>
  <Clock className="w-4 h-4 mr-2" />
  Horários
</Button>
```

---

## Task 3: Config Horários Settings ⏱️ 1h
**Arquivo**: `/src/pages/Settings.tsx`
**Adicionar nova tab "Horários"**

**Estrutura**:
```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const [schedule, setSchedule] = useState({
  monday: {open: '08:00', close: '22:00', closed: false},
  tuesday: {open: '08:00', close: '22:00', closed: false},
  // ... outros dias
});

useQuery({
  queryKey: ["schedule", companyId],
  queryFn: async () => {
    const res = await fetch(`/v1/settings/${companyId}/schedule`);
    const data = await res.json();
    setSchedule(data.schedule || {});
    return data;
  }
});

const saveScheduleMutation = useMutation({
  mutationFn: async () => {
    const res = await fetch(`/v1/settings/${companyId}/schedule`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({schedule})
    });
    return res.json();
  }
});

// JSX (adicionar tab após última existente):
<TabsContent value="horarios">
  <Card>
    <CardHeader>
      <CardTitle>Horários de Funcionamento</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(dia => (
        <div key={dia} className="flex items-center gap-4">
          <Checkbox
            checked={!schedule[dia]?.closed}
            onCheckedChange={(checked) => {
              setSchedule({...schedule, [dia]: {...schedule[dia], closed: !checked}});
            }}
          />
          <span className="w-24">{traduzirDia(dia)}</span>
          <Input
            type="time"
            value={schedule[dia]?.open || ''}
            onChange={(e) => setSchedule({...schedule, [dia]: {...schedule[dia], open: e.target.value}})}
            disabled={schedule[dia]?.closed}
            className="w-32"
          />
          <span>às</span>
          <Input
            type="time"
            value={schedule[dia]?.close || ''}
            onChange={(e) => setSchedule({...schedule, [dia]: {...schedule[dia], close: e.target.value}})}
            disabled={schedule[dia]?.closed}
            className="w-32"
          />
        </div>
      ))}
      <Button onClick={() => saveScheduleMutation.mutate()}>
        Salvar Horários
      </Button>
    </CardContent>
  </Card>
</TabsContent>

// Helper função:
const traduzirDia = (dia: string) => {
  const map = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  return map[dia] || dia;
};
```

---

## Task 4: Histórico Pedidos Customers ⏱️ 1h
**Arquivo**: `/src/pages/Customers.tsx`
**Adicionar Sheet ao clicar cliente**

**Código**:
```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

const { data: customerOrders } = useQuery({
  queryKey: ["customer-orders", selectedCustomer?.phone],
  queryFn: async () => {
    if (!selectedCustomer) return null;
    const res = await fetch(`/v1/customers/${selectedCustomer.phone}/orders?company_id=${companyId}`);
    return res.json();
  },
  enabled: !!selectedCustomer
});

// JSX (adicionar ao final antes </div>):
<Sheet open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
  <SheetContent side="right" className="w-[600px]">
    <SheetHeader>
      <SheetTitle>{selectedCustomer?.name || 'Cliente'}</SheetTitle>
      <p className="text-sm text-muted-foreground">{selectedCustomer?.phone}</p>
    </SheetHeader>

    {customerOrders && (
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pedidos</p>
              <p className="text-2xl font-bold">{customerOrders.total_pedidos}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">{customerOrders.valor_total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold">{customerOrders.ticket_medio}</p>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="font-semibold mb-4">Histórico de Pedidos</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {customerOrders.orders?.map((order: any) => (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => {/* TODO: abrir detalhes pedido */}}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge>{order.status}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      {order.items?.length} item(ns) • {order.payment_method}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    )}
  </SheetContent>
</Sheet>
```

**Trigger**: Adicionar onClick na lista clientes pra setar `selectedCustomer`.

---

## Task 5: Remover Aba WhatsApp ⏱️ 5min
**Arquivo**: `/src/pages/WhatsApp.tsx`

**Buscar linha com**:
```tsx
<Tabs defaultValue="conversas">
  <TabsList>
    <TabsTrigger value="conversas">Conversas</TabsTrigger>
```

**Remover Tabs wrapper completo**, deixar só conteúdo relevante (config ou status).

---

## Task 6: Slider Pedido Manual (COMPLEXO) ⏱️ 2-3h
**Arquivos novos**:
- `/src/components/orders/ManualOrderSidebar.tsx`
- `/src/components/orders/CategoryGrid.tsx`
- `/src/components/orders/ProductSearch.tsx`

**Estrutura ManualOrderSidebar.tsx**:
```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ManualOrderSidebar({ open, onClose, companyId }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");

  const addItem = (product) => {
    setItems([...items, {
      ...product,
      quantity: 1,
      temp_id: Date.now()
    }]);
  };

  const removeItem = (tempId) => {
    setItems(items.filter(i => i.temp_id !== tempId));
  };

  const updateQuantity = (tempId, qty) => {
    setItems(items.map(i => i.temp_id === tempId ? {...i, quantity: qty} : i));
  };

  const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    const payload = {
      company_id: companyId,
      customer_name: customerName,
      customer_phone: customerPhone,
      address,
      address_number: addressNumber,
      address_complement: addressComplement,
      items: items.map(i => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      delivery_fee: deliveryFee,
      payment_method: paymentMethod
    };

    const res = await fetch('/v1/customers/manual-order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toast({title: "Pedido criado com sucesso!"});
      onClose();
      // Reset form
    } else {
      toast({title: "Erro ao criar pedido", variant: "destructive"});
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[80%] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Pedido Manual</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Cliente */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Nome" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input placeholder="Telefone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              <Textarea placeholder="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Número" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
                <Input placeholder="Complemento" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Itens do Pedido</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="categorias">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="categorias">Categorias</TabsTrigger>
                  <TabsTrigger value="busca">Busca</TabsTrigger>
                </TabsList>

                <TabsContent value="categorias">
                  <CategoryGrid onSelectProduct={addItem} companyId={companyId} />
                </TabsContent>

                <TabsContent value="busca">
                  <ProductSearch onSelectProduct={addItem} companyId={companyId} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Carrinho */}
          {items.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Itens Adicionados</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => (
                  <div key={item.temp_id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.temp_id, parseInt(e.target.value))}
                        className="w-16"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.temp_id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Totais */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1">Taxa Entrega</label>
                <Input
                  type="number"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <div>
                <label className="block mb-2">Forma de Pagamento</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t">
                <span>Total</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              <Button onClick={handleSubmit} className="w-full" size="lg">
                Criar Pedido
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**CategoryGrid.tsx** (stub, implementar grid categorias→produtos):
```tsx
// Buscar categorias + produtos, mostrar grid clicável
```

**ProductSearch.tsx** (stub, implementar Command search):
```tsx
// Input busca + lista filtrada produtos
```

**Trigger**: Adicionar botão flutuante em Orders.tsx:
```tsx
<Button
  className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
  size="icon"
  onClick={() => setShowManualOrder(true)}
>
  <Plus className="w-6 h-6" />
</Button>
```

---

## Ordem Implementação Recomendada
1. Task 1 (filtro archived) — 10min
2. Task 5 (remover aba WhatsApp) — 5min
3. Task 2 (botões header) — 30min
4. Task 3 (horários settings) — 1h
5. Task 4 (histórico clientes) — 1h
6. Task 6 (pedido manual) — 2-3h

**Total estimado: 4-5h**

---

## Referências UI Pedido Manual
- iFood Gerente: https://gerente.ifood.com.br
- Rappi Admin
- 99Food Dashboard
- PedidoJá Backoffice

Layout comum: sidebar 70-80% largura, tabs categorias/busca, carrinho inferior fixo.

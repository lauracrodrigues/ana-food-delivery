# Implementação Melhorias Painel Pedidos

## Backend Implementado ✅

### 1. Auto-Arquivamento Pedidos
- **Worker**: `/workers/autoArquivamento.js`
- **Cron**: 03:00 diário
- **Regras**:
  - `completed` >24h → `archived`
  - `cancelled` >6h → `archived`
  - `delivering` >48h → alerta + `archived` forçado
- **Status**: Ativo em `worker.js:v2.2.0`

### 2. API Clientes
**Base**: `/v1/customers` (ou `/customers`)

- `GET /:phone/orders?company_id=UUID` — Histórico pedidos cliente
  - Retorna: total_pedidos, valor_total, ticket_medio, orders[]
  - Inclui pedidos archived

- `GET /:phone/stats?company_id=UUID` — RFM + padrões
  - Retorna: rfm{recencia, frequencia, monetario}, padroes{horario, dias}

- `POST /manual-order` — Criar pedido manual
  - Body: company_id, customer_name, customer_phone, address, items[], delivery_fee, payment_method, notes
  - Retorna: {success: true, order}

### 3. API Settings
**Base**: `/v1/settings` (ou `/settings`)

- `GET /:company_id/schedule` — Buscar horários funcionamento
  - Retorna: {schedule: {monday: {open, close, closed}, ...}}

- `PATCH /:company_id/schedule` — Atualizar horários
  - Body: {schedule: {monday: {...}, tuesday: {...}}}

- `GET /:company_id/whatsapp` — Config robô
  - Retorna: {robot_enabled, status_messages_enabled, session_name}

- `PATCH /:company_id/whatsapp` — Toggle robô/mensagens
  - Body: {robot_enabled: boolean, status_messages_enabled: boolean}

### 4. Banco
- Tabela `order_status_history`: tracking mudanças status
- Função `get_order_with_timing(UUID)`: retorna pedido + timing
- Coluna `whatsapp_config.send_status_messages`: flag mensagens status
- RLS habilitado todas tabelas

---

## Frontend TODO 🚧

### A. Tela Pedidos (`/src/pages/Orders.tsx`)

#### A1. Botões Header
Adicionar ao lado "Loja Aberta/Fechada":

```tsx
<Button variant="outline" size="sm" onClick={toggleRobot}>
  <Bot className="w-4 h-4 mr-2" />
  {robotEnabled ? "Robô Ativo" : "Robô Desativado"}
</Button>

<Button variant="outline" size="sm" onClick={toggleStatusMessages}>
  <MessageSquare className="w-4 h-4 mr-2" />
  {statusMessagesEnabled ? "Msgs Status: ON" : "Msgs Status: OFF"}
</Button>

<Button variant="ghost" size="sm" onClick={() => navigate('/settings#horarios')}>
  <Clock className="w-4 h-4 mr-2" />
  Horários
</Button>
```

**Endpoints**:
- GET `/v1/settings/:company_id/whatsapp`
- PATCH `/v1/settings/:company_id/whatsapp`

#### A2. Sidebar Pedido Manual
Adicionar slider direita→esquerda (80% largura):

**Componente**: `/src/components/orders/ManualOrderSidebar.tsx`

**Estrutura**:
```tsx
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="right" className="w-[80%] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Novo Pedido Manual</SheetTitle>
    </SheetHeader>

    {/* Seção Cliente */}
    <div className="space-y-4 mt-6">
      <Input label="Nome Cliente" />
      <Input label="Telefone" />
      <Textarea label="Endereço" />
      <Input label="Número" />
      <Input label="Complemento" />
    </div>

    {/* Seção Itens */}
    <Tabs defaultValue="categorias">
      <TabsList>
        <TabsTrigger value="categorias">Categorias</TabsTrigger>
        <TabsTrigger value="busca">Busca</TabsTrigger>
      </TabsList>

      <TabsContent value="categorias">
        {/* Grid categorias → produtos */}
        <CategoryGrid />
      </TabsContent>

      <TabsContent value="busca">
        <Command>
          <CommandInput placeholder="Buscar produto..." />
          <CommandList>
            {/* Lista produtos */}
          </CommandList>
        </Command>
      </TabsContent>
    </Tabs>

    {/* Carrinho */}
    <div className="mt-6 border-t pt-4">
      <h3>Itens Adicionados</h3>
      {items.map(item => (
        <CartItem key={item.id} item={item} onRemove={remove} />
      ))}
      
      <div className="mt-4">
        <Input label="Taxa Entrega" type="number" />
        <Select label="Forma Pagamento">
          <option>Dinheiro</option>
          <option>PIX</option>
          <option>Cartão</option>
        </Select>
      </div>

      <div className="flex justify-between mt-4">
        <p>Subtotal: R$ {formatPrice(subtotal)}</p>
        <p>Total: R$ {formatPrice(total)}</p>
      </div>

      <Button onClick={handleSubmit} fullWidth>
        Criar Pedido
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

**Endpoint**: `POST /v1/customers/manual-order`

**Referência UI**: iFood Gerente, Rappi Gerente, 99Food Admin (pesquisar screenshots)

#### A3. Filtro Arquivamento
No componente `OrdersKanban`:
- Query pedidos: adicionar `status: neq.archived`
- Coluna "Concluídos": limitar 50 cards + mostrar só <24h

### B. Tela Clientes (`/src/pages/Customers.tsx`)

#### B1. Histórico Pedidos
Ao clicar cliente, abrir modal/sidebar:

```tsx
<Sheet>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>{customer.name}</SheetTitle>
      <p>{customer.phone}</p>
    </SheetHeader>

    <div className="mt-6">
      <h3>Estatísticas</h3>
      <p>Total Pedidos: {stats.total_pedidos}</p>
      <p>Valor Total: {stats.valor_total}</p>
      <p>Ticket Médio: {stats.ticket_medio}</p>
    </div>

    <div className="mt-6">
      <h3>Histórico Pedidos</h3>
      <ScrollArea className="h-[400px]">
        {orders.map(order => (
          <Card key={order.id} onClick={() => viewOrder(order)}>
            <p>#{order.order_number}</p>
            <p>{order.status}</p>
            <p>{formatDate(order.created_at)}</p>
          </Card>
        ))}
      </ScrollArea>
    </div>
  </SheetContent>
</Sheet>
```

**Endpoints**:
- GET `/v1/customers/:phone/orders?company_id=UUID`
- GET `/v1/customers/:phone/stats?company_id=UUID`

### C. Tela WhatsApp (`/src/pages/WhatsApp.tsx`)

#### C1. Remover Aba Conversas
Arquivo: `WhatsApp.tsx:linha~X`

Remover:
```tsx
<Tabs defaultValue="conversas">
  <TabsList>
    <TabsTrigger value="conversas">Conversas</TabsTrigger>
    <TabsTrigger value="config">Configurações</TabsTrigger>
  </TabsList>
  ...
</Tabs>
```

Substituir por view única (config ou dashboard).

### D. Tela Settings (`/src/pages/Settings.tsx`)

#### D1. Seção Horários Funcionamento
Adicionar tab "Horários":

```tsx
<Card>
  <CardHeader>
    <CardTitle>Horários de Funcionamento</CardTitle>
  </CardHeader>
  <CardContent>
    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(dia => (
      <div key={dia} className="flex items-center gap-4 mb-4">
        <Checkbox
          checked={!schedule[dia]?.closed}
          onCheckedChange={(checked) => updateDay(dia, 'closed', !checked)}
        />
        <span className="w-24">{traduzirDia(dia)}</span>
        <Input
          type="time"
          value={schedule[dia]?.open || ''}
          onChange={(e) => updateDay(dia, 'open', e.target.value)}
          disabled={schedule[dia]?.closed}
        />
        <span>às</span>
        <Input
          type="time"
          value={schedule[dia]?.close || ''}
          onChange={(e) => updateDay(dia, 'close', e.target.value)}
          disabled={schedule[dia]?.closed}
        />
      </div>
    ))}
    <Button onClick={saveSchedule}>Salvar Horários</Button>
  </CardContent>
</Card>
```

**Endpoints**:
- GET `/v1/settings/:company_id/schedule`
- PATCH `/v1/settings/:company_id/schedule`

---

## Ordem Implementação Recomendada

1. **OrdersKanban** — filtro archived (rápido)
2. **Orders.tsx** — botões header robô/msgs (médio)
3. **Settings.tsx** — seção horários (médio)
4. **Customers.tsx** — histórico pedidos (médio)
5. **WhatsApp.tsx** — remover aba conversas (rápido)
6. **ManualOrderSidebar** — pedido manual (complexo, 2-3h)

---

## Testes Backend

```bash
# Histórico cliente
curl "http://localhost:3000/v1/customers/556292271019/orders?company_id=beb61f71-65ee-46d4-9c30-67c38c9d33a7"

# Config WhatsApp
curl "http://localhost:3000/v1/settings/beb61f71-65ee-46d4-9c30-67c38c9d33a7/whatsapp"

# Toggle robô
curl -X PATCH "http://localhost:3000/v1/settings/beb61f71-65ee-46d4-9c30-67c38c9d33a7/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"robot_enabled":false}'

# Criar pedido manual
curl -X POST "http://localhost:3000/v1/customers/manual-order" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id":"beb61f71-65ee-46d4-9c30-67c38c9d33a7",
    "customer_name":"Teste Manual",
    "customer_phone":"5562999999999",
    "address":"Rua Teste 123",
    "items":[{"name":"Marmita Grande","price":22,"quantity":1}],
    "delivery_fee":5,
    "payment_method":"dinheiro"
  }'
```

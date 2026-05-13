# Regras de Negócio — AnaFood

## Pedidos

### Status Flow
```
pending → preparing → ready → delivering → completed
                                         → cancelled
completed/cancelled → archived (cron job, não frontend)
```

**Regras:**
- `pending` → `preparing` = aceite manual ou auto_accept
- `delivering` só para type = 'delivery' (não 'pickup' ou 'table')
- Auto-arquivo: completed >24h, cancelled >6h
- `delivering` >48h = alerta + arquivo forçado
- Pedido arquivado NUNCA aparece no kanban (filtrado no frontend)

### Numeração de Pedidos
- Modo `sequential`: incrementa sempre, nunca reseta
- Modo `daily`: reseta no horário configurado (`order_numbering_reset_time`)
- Formato: 3 dígitos com zero à esquerda (ex: `001`, `042`)

### Pedido Manual
- Criado por operador (não pelo bot)
- Não passa pelo agente LLM
- Registrado via `POST /api-orders` com `source: 'manual'`

## Multi-Tenant

- Cada empresa = 1 `company_id`
- Usuário pertence a 1 empresa (via `profiles.company_id`)
- Roles: `super_admin` (SaaS admin) > `company_admin` > `company_staff`
- `super_admin` pode ver todos os tenants
- Demais roles veem SOMENTE sua empresa

## WhatsApp Bot

- Bot processa apenas mensagens de texto
- Cardápio em 3 camadas: `cardapio_dia` → `products` → hardcoded
- Memória de preferências salva em `customers.preferences.memoria`
- Histórico de conversa em `msg_history` (por phone + company_id)
- Bot pode ser pausado por empresa (`robot_enabled = false`)
- Bot pode ser pausado por contato específico (`whatsapp_agent_control`)
- Debounce de 10s para notificações (evitar spam)

## Configurações

### Config da Empresa (compartilhada entre todos usuários)
`store_settings`:
- `store_open` — abre/fecha loja
- `auto_accept` — aceite automático de pedidos
- `delivery_time` / `pickup_time` — tempo estimado (minutos)
- `alert_time` — alerta de atraso (minutos)
- `debounce_ms` — debounce de notificações
- `order_numbering_mode` / `order_numbering_reset_time`

### Config Pessoal do Usuário (isolada por user_id)
`profiles.preferences`:
- `soundEnabled` — som de notificação
- `notificationSound` — arquivo de som
- `visibleColumns` — colunas visíveis no kanban
- `autoPrint` — impressão automática pessoal
- `printerSettings` — impressora pessoal por setor

## Horários de Funcionamento

`companies.schedule` (JSONB):
```json
{
  "monday": { "open": "08:00", "close": "22:00", "closed": false },
  ...
}
```
- Usado pelo bot para recusar pedidos fora do horário
- Exibido no cardápio digital público

## Billing / Planos

- Planos: Básico, Profissional, Enterprise
- Status: `trialing`, `active`, `past_due`, `cancelled`
- Cobrança via Stripe (webhook atualiza `companies.subscription_status`)
- Acesso bloqueado se `past_due` ou `cancelled` (a implementar)

## Fidelidade (não implementado)

- Regra planejada: X pontos por real gasto
- Resgate: desconto em pedido futuro
- Integração WhatsApp: bot informa saldo de pontos

## Estoque (não implementado)

- Regra planejada: produto com estoque 0 = indisponível automaticamente
- Baixa automática ao confirmar pedido
- Alerta quando estoque < mínimo configurado

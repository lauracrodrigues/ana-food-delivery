# Spec: Automações

## Status: 🚧 PARCIALMENTE IMPLEMENTADO

## O que já existe
- Bot WhatsApp (automação de atendimento)
- Auto-arquivamento de pedidos (cron job backend)
- Mensagens de status automáticas (WhatsApp ao mudar status do pedido)
- Debounce de notificações

## O que falta

### 1. Automações Configuráveis pelo Usuário
Motor de regras: "Se [condição] então [ação]"

**Condições planejadas:**
- Pedido em determinado status há X minutos
- Cliente inativo há X dias
- Produto com estoque abaixo do mínimo
- Horário específico do dia
- Valor do pedido acima/abaixo de X

**Ações planejadas:**
- Enviar mensagem WhatsApp (template)
- Mudar status do pedido
- Alertar operador (push/sound)
- Aplicar desconto automático
- Bloquear produto

### 2. Automações de Exemplo Prontas
- "Bom dia" automático ao abrir loja
- "Volte sempre" 2h após entrega concluída
- Lembrete de pedido abandonado (24h)
- Alerta de pedido esquecido em "preparando" >30min

## Banco de Dados Planejado

```sql
CREATE TABLE automations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL,
  name        TEXT NOT NULL,
  enabled     BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL,  -- 'order_status', 'customer_inactive', 'schedule', 'stock_low'
  trigger_config JSONB,         -- condições específicas
  action_type TEXT NOT NULL,   -- 'send_whatsapp', 'change_status', 'notify_operator'
  action_config JSONB,          -- dados da ação
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE automation_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL,
  automation_id UUID REFERENCES automations(id),
  triggered_at  TIMESTAMPTZ DEFAULT now(),
  context       JSONB,  -- dados que dispararam a automação
  result        TEXT    -- 'success' | 'error'
);
```

## Design Técnico

- **Motor**: Edge Function chamada por cron (a cada 5min) + triggers PostgreSQL
- **WhatsApp actions**: via `whatsapp-send` Edge Function existente
- **UI**: painel de automações em `/automacoes`

## Prioridade
Média — muito valor para usuários avançados mas complexidade alta.

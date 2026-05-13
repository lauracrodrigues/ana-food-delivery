# Design: WhatsApp

## Arquitetura

```
Evolution API (webhook) → api.anafood.vip/webhook/whatsapp
  └── agentHarness.js (USE_HARNESS=true)
        ├── llmProvider.js — abstração multi-LLM (OpenAI/Anthropic/Gemini/Groq)
        ├── cardapioService.js — cardápio em 3 camadas
        ├── memoriaService.js — preferências do cliente
        └── tokenMonitor.js — custo por chamada LLM
```

## Banco de Dados

- `msg_history`: histórico de conversa por telefone + company_id
- `customers`: preferences JSONB + pending_order JSONB + last_order_data JSONB
- `token_logs`: monitoramento de custo por chamada (migration 004 pendente)

## Fluxo de Mensagem

1. Webhook recebe mensagem do cliente
2. Carrega histórico (`msg_history`) e preferências (`customers.preferences.memoria`)
3. Chama LLM com contexto + tools disponíveis
4. LLM executa tools: buscar cardápio, criar pedido, consultar status
5. Resposta enviada via Evolution API
6. Histórico salvo em `msg_history`

## Config por Empresa

- `companies.robot_enabled` BOOLEAN — liga/desliga bot
- `companies.status_messages_enabled` BOOLEAN — mensagens automáticas de status
- `companies.session_name` — sessão Evolution API

## Multi-Provider LLM

`LLM_PROVIDER` env var:
- `openai` (padrão) — GPT-4o
- `anthropic` — Claude
- `gemini` — Gemini Pro
- `groq` — Llama

## Decisões de Design

1. **Agente vs State Machine**: migrado de state machine rígido para agente LLM com tools — mais flexível para variações de conversa
2. **Cardápio em 3 camadas**: `cardapio_dia` (menu do dia) → `products` (banco) → hardcoded (fallback)
3. **Memória persistente**: preferências salvas em JSONB para personalizar atendimento

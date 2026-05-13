# Integrações — AnaFood

## Evolution API (WhatsApp)

**URL**: `https://evo.anafood.vip`  
**Documentação**: Evolution API v2  
**Autenticação**: API Key via header

### Fluxo
```
Cliente manda mensagem
    ↓
Evolution API → POST /webhook/whatsapp → api.anafood.vip
    ↓
agentHarness.js processa com LLM
    ↓
Resposta → POST /whatsapp-send (Edge Function)
    ↓
whatsapp-evolution Edge Function → Evolution API sendMessage
    ↓
Mensagem entregue ao cliente
```

### Edge Functions Relacionadas
- `whatsapp-evolution` — proxy de configuração/status
- `whatsapp-send` — envio de mensagem com validação de número
- `whatsapp-chat` — listagem de chats e mensagens

### Config por Empresa
- `companies.session_name` — nome da sessão no Evolution
- `companies.robot_enabled` — liga/desliga o bot
- `whatsapp_config` — configurações da sessão + status messages

---

## Stripe (Billing)

**Modo**: Checkout hospedado (Stripe Hosted Checkout)  
**Webhook**: `https://api.anafood.vip/webhook/stripe`

### Fluxo
```
Empresa clica "Assinar"
    ↓
Cria Stripe Checkout Session (backend)
    ↓
Redireciona para checkout.stripe.com
    ↓
Pagamento confirmado → webhook → atualiza companies.subscription_status
    ↓
Redirect para /checkout/success
```

### Validação de Webhook
```typescript
// OBRIGATÓRIO — sem isso, aceita webhooks falsos
const event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
```

---

## QZ Tray (Impressão Térmica)

**Tipo**: Aplicativo desktop (Electron-like) que expõe API local  
**Porta**: WebSocket local `wss://localhost:8181`

### Fluxo
```
Frontend detecta QZ Tray disponível
    ↓
qz-sign Edge Function assina os comandos ESC/POS
    ↓
Frontend envia comandos via WebSocket para QZ Tray
    ↓
QZ Tray envia para impressora via USB/Serial/Rede
```

### Arquivos
- `src/lib/qz-tray.ts` — cliente QZ Tray
- `src/lib/print-templates.ts` — templates de cupom
- `src/lib/thermal-formatter.ts` — ESC/POS commands
- `supabase/functions/qz-sign/` — assinatura de comandos

### Impressoras Configuradas
- Caixa (front office)
- Cozinha 1, Cozinha 2
- Copa/Bar

---

## Mapbox (Mapas)

**Uso**: Busca de endereço e visualização de zona de entrega  
**Auth**: Token público via `VITE_MAPBOX_TOKEN`  
**Componente**: `AddressSearchWithMap`

---

## Sentry (Error Tracking)

**Uso**: Captura de erros não tratados em produção  
**Init**: `src/lib/sentry.ts`  
**DSN**: via variável de ambiente `VITE_SENTRY_DSN`

---

## Supabase Auth (Autenticação)

**Tipo**: Email/senha (OAuth social planejado)  
**JWT TTL**: 1 hora (auto-refresh pelo SDK)  
**Providers**: Email built-in  
**MFA**: Não configurado

---

## LLM Providers (Bot WhatsApp)

Abstração em `src/providers/llmProvider.js` (backend):

| Provider | Modelo padrão | Env Var |
|----------|---------------|---------|
| OpenAI (padrão) | GPT-4o | `OPENAI_API_KEY` |
| Anthropic | Claude 3.5 | `ANTHROPIC_API_KEY` |
| Gemini | Gemini Pro | `GEMINI_API_KEY` |
| Groq | Llama 3 | `GROQ_API_KEY` |

Seleção via `LLM_PROVIDER` env var.

# Tasks: WhatsApp

## Implementado ✅

- [x] Agente LLM com tools (agentHarness.js)
- [x] Abstração multi-provider LLM (OpenAI, Anthropic, Gemini, Groq)
- [x] Cardápio em 3 camadas (cardapio_dia → products → hardcoded)
- [x] Memória de preferências do cliente (customers.preferences.memoria)
- [x] Histórico de conversa por sessão (msg_history)
- [x] Toggle robô por empresa no painel
- [x] Monitor de conversas (WhatsAppChat)
- [x] Token monitoring (tokenMonitor.js)
- [x] 72/72 testes do agentHarness passando
- [x] **Personalidade do agente** (amigável / descontraído / formal) — v1.0.0
- [x] **Regras de comportamento customizadas** (lista dinâmica + templates prontos) — v1.0.0
- [x] **Preview do prompt assembelado** — v1.0.0

## Pendente / Backlog

- [ ] Migration token_logs (004_marmita_products_token_logs.sql) no Supabase
- [ ] Dashboard de custo LLM por empresa
- [x] **Auto-resume após intervenção humana** — v2.0.0 (Feature 2 FoodClub)
- [x] **PIX Dinâmico + verificação automática** (Feature 3 FoodClub) — implementado anteriormente, hardening de segurança (signature HMAC obrigatória, secret em env) em 2026-05-18
- [ ] Suporte a imagens de cardápio no WhatsApp
- [ ] Multi-sessão (empresa com múltiplos números)
- [x] **TTS (Text-to-Speech — respostas em áudio)** — v1.0.0 (Feature 8)

## NOVO: Boas-vindas dinâmicas + comando /reset (precisa implementação no agente)

### Admin entregue ✅
- Tabela `companies` com colunas `welcome_message_new` e `welcome_message_returning`
- Página `/whatsapp` aba **Boas-vindas** edita os 2 templates
- Página `/daily-menu` CRUD do `cardapio_dia` (já existia, agora exposto no painel)
- Sidebar WhatsApp > Cardápio do Dia

### Falta no agente externo (`agentHarness.js` em api.anafood.vip)
- [x] **Detectar primeiro contato do dia** por (`company_id`, `customer_phone`):
  - Lookup `orders` por `customer_phone` → se >0, é recorrente; senão, novo
  - Considerar primeiro contato dentro de janela de 6h (não enviar boas-vindas em cada msg)
- [ ] **Variáveis do template**:
  - `{empresa}` → `companies.fantasy_name ?? companies.name`
  - `{nome}` → push name do WhatsApp (vem na payload da Evolution)
  - `{cardapio_dia}` → buscar `cardapio_dia` da data atual e formatar:
    ```
    🍱 Tamanho:
    • Médio — R$ 20,00
    • Grande — R$ 26,00
    🥩 Proteína:
    • Carne cozida
    • Frango frito
    🍚 Acompanhamento:
    • Arroz branco
    ...
    ```
  - `{ultimo_pedido}` → pegar último order do customer_phone (resumo curto)
- [ ] **Carregar template correto** de `companies.welcome_message_new` ou `welcome_message_returning`,
  substituir variáveis, enviar.
- [ ] **Fallback** se coluna vazia: usar texto padrão hardcoded (já documentado em
  `WelcomeMessageEditor.tsx` constants DEFAULT_NEW e DEFAULT_RETURNING).

### Comando /reset (também no agente externo)
- [ ] Detecção: msg recebida igual `/reset` (case-insensitive)
- [ ] Resposta: `"Confirma que deseja apagar seus dados? Responda SIM ou NÃO"`
- [ ] Salvar estado de conversa = `aguardando_confirmacao_reset` em `customers.preferences.flow_state`
- [ ] Próxima msg:
  - Se `SIM` (case-insensitive, com/sem acento): 
    ```sql
    DELETE FROM msg_history WHERE company_id = ? AND customer_phone = ?;
    UPDATE customers SET preferences = '{}'::jsonb, pending_order = NULL, last_order_data = NULL
      WHERE company_id = ? AND phone = ?;
    ```
    Responder: `"Pronto! Suas informações foram apagadas. Vamos começar do zero — qual seu pedido?"`
  - Se `NÃO` ou outro: limpar `flow_state`, responder: `"Reset cancelado. Vamos continuar!"`

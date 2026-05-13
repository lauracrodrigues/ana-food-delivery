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
- [ ] **PIX Dinâmico + verificação automática** (Feature 3 FoodClub)
- [ ] Suporte a imagens de cardápio no WhatsApp
- [ ] Multi-sessão (empresa com múltiplos números)
- [x] **TTS (Text-to-Speech — respostas em áudio)** — v1.0.0 (Feature 8)

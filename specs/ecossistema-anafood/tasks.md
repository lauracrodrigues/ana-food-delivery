# Tasks: Ecossistema Ana Food

**Status:** in progress
**Last updated:** 2026-05-29

Marque com `[x]` ao concluir. Bloqueadores em **negrito**.

---

## Fase 0 — Spikes e decisões (3 dias)

### 0.1 Spike injeção WhatsApp Web (1 dia)
- [ ] Clonar `auto-reply` e isolar `whatsapp-api-inject.js`
- [ ] Rodar contra WhatsApp Web atual (versão atual do DOM, 2026-05-29)
- [ ] Testar: enviar msg, receber msg, detectar typing, media, áudio
- [ ] Documentar selectors que mudaram (se houver)
- [ ] **Decisão GO/NO-GO**: se injeção quebrar muito → priorizar Cloud API

### 0.2 Spike WhatsApp Cloud API (1 dia)
- [ ] Criar conta Meta for Developers + app + número teste
- [ ] Validar: enviar texto, receber webhook, enviar media, enviar template (24h+)
- [ ] Medir custo: free tier 1000 conversas/mês, depois $0.0075-0.05/msg (BR)
- [ ] Documentar limites: templates pré-aprovados, janela 24h, opt-in

### 0.3 Decisões trancadas (0.5 dia)
- [ ] Canal Electron↔nuvem confirmado: Socket.io primary + REST fallback
- [ ] UI única confirmada: `__IN_SYSTEM_VIEW` flag
- [ ] Sem Evolution: criar plano de descomissionamento (próxima fase)
- [ ] **Aprovação Tarcisio** pra prosseguir

### 0.4 Setup repo monorepo opcional (0.5 dia)
- [ ] Decidir: monorepo (turborepo/nx) vs 4 repos separados
- [ ] Se monorepo: `packages/{backend,delivery,electron,shared}` + `pnpm workspaces`
- [ ] Se separados: manter atual, deletar `auto-reply` após Fase 2

---

## Fase 1 — Ana-Food (nuvem): adapter pattern + endpoints (3 dias)

### 1.1 Schema DB
- [ ] Migration: `ALTER TABLE companies ADD whatsapp_backend, cloud_api_token, cloud_api_phone_id`
- [ ] Migration: `ALTER TABLE orders ADD scheduled_for, source`
- [ ] Migration: `CREATE TABLE electron_terminals, electron_metrics, whatsapp_messages`
- [ ] Aplicar via `psql` no Supabase prod

### 1.2 Endpoints Express
- [ ] `POST /v1/whatsapp/inbound` (idempotente por `Idempotency-Key: msg_id`)
- [ ] `POST /v1/whatsapp/outbound-decide` (recebe inbound interno, devolve resposta humanizada)
- [ ] `POST /electron/heartbeat` (terminal_id, version, queueDepth, online)
- [ ] `GET /electron/status/:companyId` (admin web vê estado dos terminais)
- [ ] `POST /v1/metrics/electron` (batch insert em `electron_metrics`)

### 1.3 Socket.io server (/ws/electron)
- [ ] Adicionar namespace `/ws/electron` (separado do `/ws/printer` existente)
- [ ] Auth via JWT (company_id no payload)
- [ ] Events: `whatsapp:incoming` (in), `whatsapp:send` (out), `heartbeat` (in), `config:update` (out)
- [ ] Reconnect strategy (server-side: limpar sessions órfãs >5min)

### 1.4 Anti-ban server refinement
- [ ] `sendThrottle` por número (já existe — revisar)
- [ ] `quietHours` por company (já existe — revisar)
- [ ] Janela 24h: rejeitar outbound se último inbound do cliente > 24h
- [ ] Warmup novo número: ramp-up 50 msg/dia → 200 → 500 (configurable)

### 1.5 Desativar Evolution
- [ ] Marcar instância Caribe no Evolution como deprecated
- [ ] Não destruir ainda (rollback se Electron falhar)
- [ ] Plano: após 30 dias estável → `DELETE /instance/delete/Caribe`

---

## Fase 2 — Electron unificado (5-7 dias)

### 2.1 Base do projeto
- [ ] Renomear repo `ana-food-print` → `ana-food-desktop`
- [ ] Atualizar `package.json` (productName, appId)
- [ ] Manter electron-builder NSIS + auto-update (já configurados)

### 2.2 Portar React do delivery
- [ ] Configurar `loadURL` network-first: `https://app.anafood.vip?__IN_SYSTEM_VIEW=true`
- [ ] Service Worker: Workbox NetworkFirst pra app-shell, CacheFirst pra assets
- [ ] Baseline build embutida em `resources/baseline-app/`
- [ ] Renderer process: detectar `__IN_SYSTEM_VIEW` → mostrar só páginas operacionais

### 2.3 Portar injeção WhatsApp (auto-reply)
- [ ] Copiar `whatsapp-api-inject.js` → `electron/src/whatsapp/injection/`
- [ ] Manter JS (não migrar TS, interface tipada acima)
- [ ] Encapsular em `InjectionAdapter` (implementa `WhatsAppAdapter`)
- [ ] BrowserView WhatsApp Web: `webPreferences.preload` carrega inject script
- [ ] Lidar com login: QR scan + persistência de session

### 2.4 Adapter pattern + Cloud API
- [ ] Criar `electron/src/whatsapp/adapter.ts` interface
- [ ] Implementar `InjectionAdapter` (wrap do JS)
- [ ] Implementar `CloudApiAdapter` (HTTP cliente axios)
- [ ] Selector: lê `whatsapp_backend` da company config (via Supabase)
- [ ] Listener: realtime subscribe em `companies` → recriar adapter ao mudar flag

### 2.5 Anti-ban client
- [ ] Portar `antiBan.js` (já entregue, mencionado no plano)
- [ ] Delay humano: 2.5 ms/char + jitter 30%
- [ ] Typing presence antes do send (1.5s + por word count)
- [ ] Intervalo mínimo entre msgs ao mesmo contato (3s)
- [ ] Limite diário por contato (50 msgs)
- [ ] Dedup msg_id local (SQLite cache 24h)
- [ ] Circuit breaker: 5 erros consecutivos → pause 5min + alert

### 2.6 Socket.io client
- [ ] `socket.io-client` reconnect strategy (delay 1s → 30s, randomization 0.5)
- [ ] Buffer local pra eventos durante disconnect
- [ ] Replay no reconnect
- [ ] REST fallback automático se socket down > 60s

### 2.7 Monitor de conexão
- [ ] `navigator.onLine` + heartbeat real `api.anafood.vip/health` (30s)
- [ ] Estados: `online` | `online_unstable` | `offline` | `offline_long`
- [ ] Banner UI por estado (pill, amarelo, vermelho)
- [ ] Alerta sonoro: 2h offline → som contínuo

### 2.8 Áudio alertas
- [ ] Gerar vozes TTS uma vez no Ana-Food (`gen_voices` task)
- [ ] Mensagens: novo pedido, pedido noturno, offline, ban detectado
- [ ] Embutir MP3s em `resources/audio/`
- [ ] Pre-load Audio() no startup

### 2.9 Aposentar auto-reply
- [ ] Confirmar que injection JS portada funciona idêntica
- [ ] Mover repo `auto-reply` → `archive/auto-reply-deprecated`
- [ ] README aponta pro `ana-food-desktop`

---

## Fase 3 — Offline-first SQLite (10-15 dias real, era 4-6)

### Fase 3A (5-7 dias) — React Query persist + UUID
- [ ] Instalar `@tanstack/query-sync-storage-persister` + `@tanstack/react-query-persist-client`
- [ ] Configurar persistência IndexedDB (não localStorage — limite 5MB)
- [ ] UUID gerado no client (`crypto.randomUUID()`) em todo INSERT/CREATE
- [ ] Mutations: `useMutation` com `onMutate` (optimistic) + `onError` (rollback)
- [ ] Offline mutations: pausar quando `online$=false`, resumir quando volta
- [ ] Banner offline UI (já mencionado em 2.7)

### Fase 3B (7-10 dias) — SQLite + outbox
- [ ] `better-sqlite3` no main process
- [ ] IPC handlers: `db.query` / `db.exec` / `db.transaction` (com whitelist de queries)
- [ ] Schema migrations: roda script `electron/src/db/migrations/*.sql` no startup
- [ ] Tabelas espelho: `orders`, `order_items`, `tables`, `comandas`, `cash_movements`, `customers`, `products`
- [ ] Outbox + dead_letter (schema do design.md)
- [ ] Outbox processor: cron 10s, FIFO, backoff exponencial
- [ ] Service layer (`/electron/src/services/`): operations locais + outbox push
  - [ ] `ordersService.create()` → SQLite INSERT + outbox INSERT
  - [ ] `comandasService.addItem()` → SQLite INSERT + outbox INSERT
  - [ ] `cashService.movement()` → SQLite INSERT + outbox INSERT
- [ ] Hydration: ao online, sync server-side reads (products, customers) pra SQLite

### Fase 3C (2-3 dias) — Backup + DLQ + telemetria
- [ ] Backup uploader: cron 1h, gzip + Supabase Storage upload
- [ ] Bucket `terminal-backups` com lifecycle 30d
- [ ] DLQ: tabela `outbox_dead_letter` + notify admin (push + email)
- [ ] Telemetria: heartbeat com `outboxSize`, `queueDepth`, `lastSyncAt`
- [ ] Dashboard: card no admin "Saúde dos terminais"

### Fase 3D (1-2 dias) — RLS source=electron
- [ ] JWT custom claim `source=electron` no token Electron
- [ ] Policy `orders_no_admin_edit_active` (design.md)
- [ ] Admin UI: bloquear botões edit em entidades ativas
- [ ] Testar: admin web NÃO consegue editar comanda aberta

---

## Fase 4 — Cobertura noturna (1-2 dias)

### 4.1 Cardápio agendado
- [ ] `orders.scheduled_for` no schema (Fase 1.1)
- [ ] PublicMenu detecta loja fechada → marca `scheduled_for` = próxima abertura
- [ ] UI cliente: "Loja fechada. Pedido será preparado a partir de XX:XX"
- [ ] Cron `promote-scheduled` (já existe) confere

### 4.2 Mensagem ausência WhatsApp Business
- [ ] Painel admin: card com texto pronto + botão "Copiar"
- [ ] Tutorial print: WhatsApp Business app → Configurações → Ferramentas → Mensagem de ausência
- [ ] Texto sugerido: `"Olá! Estamos fechados no momento. Acesse nosso cardápio: {link} e seu pedido será preparado quando abrirmos! 🍽️"`
- [ ] Variável `{link}` = `https://{subdomain}.anafood.vip`

### 4.3 Alerta pedidos noturnos
- [ ] Startup Electron: query orders criados nas últimas 12h + `seen=false`
- [ ] Modal: "X pedidos novos durante a noite"
- [ ] Som: voice MP3 pré-gerado
- [ ] Mark `seen=true` ao fechar modal

### 4.4 Push se celular do dono offline
- [ ] Cron Ana-Food: monitorar último heartbeat WA Web (via injection)
- [ ] Se >2h sem heartbeat E loja deveria estar aberta → push OneSignal/Expo pro dono
- [ ] Setup OneSignal: app + credenciais
- [ ] Endpoint backend: subscribe device do dono

---

## Fase 5 — Cloud API atrás de flag (3-4 dias) — DEPOIS de Fase 2-4

### 5.1 CloudApiAdapter completo
- [ ] Wrap completo da Meta Cloud API (`/messages`, `/templates`, webhooks)
- [ ] Templates pré-aprovados: cardápio, status, confirmação (BR Portuguese)
- [ ] Webhook handler: `/v1/whatsapp/cloud-webhook`
- [ ] Validação assinatura HMAC Meta

### 5.2 Migração assistida
- [ ] UI admin: botão "Migrar pra Cloud API" (com explicação custo)
- [ ] Fluxo:
  1. Validar template aprovado
  2. Setar `whatsapp_backend = 'cloud_api'`, salvar token + phone_id
  3. Realtime → Electron detecta → recria adapter
  4. Validar primeira msg
  5. Logout WhatsApp Web (libera number)

---

## Fase 6 — Integração ponta a ponta + piloto (3-4 dias)

### 6.1 Cliente piloto = Caribe
- [ ] Build Electron release (auto-update workflow)
- [ ] Install no PC do Caribe + QR scan
- [ ] Treinamento operacional (30min)
- [ ] Monitoramento intensivo 7 dias

### 6.2 Métricas
- [ ] Sentry dashboard com filtros por company_id
- [ ] Latência E2E (msg → ack) — meta P95 < 6s
- [ ] Outbox health diário
- [ ] Crash rate < 0.1%

### 6.3 Rollback plan
- [ ] Manter Evolution em standby 30 dias (instância pausada, não deletada)
- [ ] Documento rollback: como reativar Evolution se Electron falhar
- [ ] Decisão Tarcisio: vai/não vai após 30 dias

---

## Fase 7 (longo prazo, fora deste sprint)

- [ ] PowerSync (multi-terminal) — só se demandado
- [ ] Fiscal NFC-e/NF-e — documento separado
- [ ] Mobile app entregador nativo (vs PWA atual)

---

## Estimativa total revisada

| Fase | Estimativa original | Revisada |
|------|---------------------|----------|
| 0 — spikes | — | 3 dias |
| 1 — backend | 2-3 dias | 3 dias |
| 2 — Electron | 4-6 dias | 5-7 dias |
| 3 — offline | 4-6 dias | **10-15 dias** |
| 4 — noturna | 1-2 dias | 1-2 dias |
| 5 — Cloud API flag | — | 3-4 dias |
| 6 — piloto | 3-4 dias | 3-4 dias |
| **TOTAL** | **14-21 dias** | **28-38 dias úteis** |

Buffer realista 30% → **5-7 semanas calendário** com 1 dev full-time.

---

## Riscos rastreados (atualizar conforme acontecer)

| Risco | Status |
|-------|--------|
| Injection quebra com WA Web update | Spike 0.1 valida |
| Cloud API custo escala | Tier free cobre Caribe (< 1000 conv/mês) |
| SQLite outbox trava | DLQ + alert (Fase 3C) |
| RLS bloqueia outbox push | JWT custom claim (Fase 3D) |
| Auto-deploy CF Pages vs Electron offline | Service Worker network-first (2.2) |
| Ban WhatsApp Caribe (de novo) | Flag flip → Cloud API em <10min (Fase 5) |

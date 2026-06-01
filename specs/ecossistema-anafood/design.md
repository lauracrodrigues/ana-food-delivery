# Design: Ecossistema Ana Food

**Status:** approved
**Version:** 1.0
**Last updated:** 2026-05-29

---

## 1. Arquitetura macro

```
┌──────────────────────────────────────────────────────┐
│  Cliente WhatsApp                                     │
└─────────────────────┬────────────────────────────────┘
                      │
              WhatsApp servers (MD)
                      │
                      ▼
┌──────────────────────────────────────────────────────┐
│  ELECTRON UNIFICADO (PC mestre, 1 por loja)           │
│                                                       │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  WhatsApp       │  │  Renderer React          │  │
│  │  Web (BV)       │  │  (ana-food-delivery)     │  │
│  │  + injection    │  │  __IN_SYSTEM_VIEW=true   │  │
│  │  (módulo JS)    │  │  • PDV / Mesas / Kanban  │  │
│  └────────┬────────┘  │  • Caixa / Comandas      │  │
│           │           │  • Chat WA               │  │
│           │           └──────────┬───────────────┘  │
│           │                      │                   │
│  ┌────────▼──────────────────────▼───────────────┐  │
│  │  Main process (TS)                            │  │
│  │  • whatsappAdapter (injection | cloudApi)     │  │
│  │  • antiBan client (delay/typing/limites)      │  │
│  │  • Socket.io client (heartbeat + msg)         │  │
│  │  • SQLite (better-sqlite3) — offline store    │  │
│  │  • Outbox processor (FIFO + dead-letter)      │  │
│  │  • Backup uploader (1x/h → Supabase Storage)  │  │
│  │  • Printer gateway (ESC-POS)                  │  │
│  │  • Audio alerts (TTS pré-gerado embutido)     │  │
│  └────────────────────────┬──────────────────────┘  │
└───────────────────────────┼─────────────────────────┘
                            │
                Socket.io (primary)
                + REST idempotent (fallback)
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│  ANA-FOOD (nuvem, Node.js + Express)                  │
│                                                       │
│  • POST /v1/whatsapp/inbound (msg do cliente)        │
│  • POST /v1/whatsapp/outbound-decide (decide+humaniza)│
│  • POST /electron/heartbeat                          │
│  • GET  /electron/status/:companyId                  │
│  • /ws/electron (Socket.io bidirecional)             │
│                                                       │
│  Cérebro:                                             │
│  • agentHarness.js (LLM tools)                       │
│  • sendThrottle + quietHours                         │
│  • TTS (Google Cloud Chirp3 HD)                      │
│  • Anti-ban server (janela 24h, warmup)              │
│                                                       │
│  Supabase (Postgres + Realtime + Storage)             │
│  Redis (state machine, sessions)                     │
│  Stripe (billing)                                    │
│  Crons PM2 (status, overdue, alerta-titulos)         │
└──────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│  UI ADMIN (navegador)                                 │
│  app.anafood.vip → React do ana-food-delivery        │
│  • Cadastros, preços, relatórios, config             │
│  • Cardápio digital público (cliente faz pedido)     │
│  • __IN_SYSTEM_VIEW = false (oculta operacional)     │
└──────────────────────────────────────────────────────┘
```

---

## 2. Componentes detalhados

### 2.1 `whatsappAdapter` (camada de abstração — D1)

**Interface única, 2 implementações:**

```ts
// /electron/src/whatsapp/adapter.ts
interface WhatsAppAdapter {
  sendText(to: string, text: string, ctx: Context): Promise<SendResult>;
  sendMedia(to: string, media: Buffer, type: MediaType, ctx: Context): Promise<SendResult>;
  sendTyping(to: string, ms: number): Promise<void>;
  onIncoming(handler: (msg: IncomingMessage) => void): void;
  isConnected(): boolean;
  getProfile(): { jid: string; name: string };
}

// /electron/src/whatsapp/injection-adapter.ts  → portado do auto-reply
class InjectionAdapter implements WhatsAppAdapter { ... }

// /electron/src/whatsapp/cloud-api-adapter.ts   → plano B, Meta Cloud API oficial
class CloudApiAdapter implements WhatsAppAdapter { ... }
```

**Seleção:**
```ts
const flag = await getCompanyFlag(companyId, 'whatsapp_backend');
const adapter = flag === 'cloud_api' ? new CloudApiAdapter(...) : new InjectionAdapter(...);
```

**Tabela DB:**
```sql
ALTER TABLE companies ADD COLUMN whatsapp_backend text NOT NULL DEFAULT 'injection'
  CHECK (whatsapp_backend IN ('injection', 'cloud_api'));
ALTER TABLE companies ADD COLUMN cloud_api_token text; -- só se backend=cloud_api
ALTER TABLE companies ADD COLUMN cloud_api_phone_id text;
```

**Migração runtime:**
1. Admin liga flag → Electron detecta via socket
2. Encerra injection (logout WA Web)
3. Instancia CloudApiAdapter com token
4. Próxima msg usa Cloud API. **Zero code change.**

---

### 2.2 Offline-first (D3 + D4)

#### 2.2.1 Propriedade de dado por terminal

**Regra:** durante operação ativa (não-finalizada), comanda/pedido/caixa **PERTENCE** ao terminal local.

- Admin web NÃO edita essas entidades em estado ativo
- Admin web edita SÓ: cardápio, preço, config, perfil, relatórios (read-only)
- UI bloqueia botões "Editar" em entidades ativas no admin

**Enforce no backend:**
```sql
-- RLS adicional
CREATE POLICY orders_no_admin_edit_active ON orders
FOR UPDATE TO authenticated
USING (
  status IN ('cancelled', 'completed', 'archived')
  OR auth.jwt() ->> 'app_metadata' ->> 'source' = 'electron'
);
```

Electron envia JWT custom `source=electron` no header (signed). Admin web não tem.

#### 2.2.2 SQLite local (better-sqlite3)

**Tabelas espelho:** `orders`, `order_items`, `tables`, `comandas`, `cash_movements`, `customers` (cache leitura), `products` (cache leitura)

**Schema sync via migration script** roda no main process startup.

#### 2.2.3 Outbox

```sql
CREATE TABLE outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,               -- = entity uuid
  entity_type TEXT NOT NULL,               -- 'order' | 'comanda' | 'cash_movement' | etc
  operation TEXT NOT NULL,                 -- 'insert' | 'update' | 'delete'
  payload JSON NOT NULL,
  created_at INTEGER NOT NULL,             -- unix ms
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  last_attempt_at INTEGER
);

CREATE TABLE outbox_dead_letter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outbox_id INTEGER NOT NULL,
  moved_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  payload JSON NOT NULL
);
```

**Processor:**
- Roda quando `navigator.onLine === true` E Socket.io conectado
- FIFO (ORDER BY id ASC)
- Cada item: tenta upsert no Supabase via REST (idempotente por UUID)
- Sucesso → DELETE outbox
- Erro RLS / schema → DLQ + notify admin
- Erro network → backoff exponencial (max 30s)
- Após 10 tentativas → DLQ

#### 2.2.4 Detecção online/offline

```ts
// monitor.ts
const online$ = new BehaviorSubject(navigator.onLine);
window.addEventListener('online', () => online$.next(true));
window.addEventListener('offline', () => online$.next(false));

// Heartbeat real (não só network layer)
setInterval(async () => {
  try {
    await fetch('https://api.anafood.vip/health', { signal: AbortSignal.timeout(3000) });
    online$.next(true);
  } catch { online$.next(false); }
}, 30_000);
```

**UI banner:**
- Online: nada
- Offline <5min: pill "Modo offline — dados salvos local"
- Offline >5min: banner amarelo + contador
- Offline >2h: banner vermelho + alerta sonoro

#### 2.2.5 Backup local (D — disaster recovery)

```ts
// /electron/src/backup/uploader.ts
async function uploadSqliteSnapshot() {
  if (!navigator.onLine) return;
  const snapshot = await sqlite.backup(); // VACUUM INTO
  const compressed = await gzip(snapshot);
  await supabase.storage
    .from('terminal-backups')
    .upload(
      `${companyId}/${terminalId}/${Date.now()}.sqlite.gz`,
      compressed,
      { upsert: false }
    );
}
setInterval(uploadSqliteSnapshot, 60 * 60 * 1000); // 1h
```

Retenção: lifecycle policy Supabase Storage = 30 dias.

---

### 2.3 Cobertura noturna (D — push alert)

**Componentes:**

1. **Mensagem ausência WhatsApp Business** — config no celular do dono
   - Setup: painel mostra texto pronto + botão "Copiar" + screenshot tutorial

2. **Cardápio digital agendado**
   - `orders.scheduled_for` (timestamp) — NOVO campo
   - Se loja fechada (schedule check): UI marca pedido como "agendado para próxima abertura"
   - Cron `promote-scheduled` (já existe) promove para `pending` quando loja abrir

3. **Alerta de pedidos da noite**
   - Electron startup pós-abertura: query orders criados nas últimas 12h com `created_at > last_seen`
   - Som + modal: "X pedidos novos durante a noite"

4. **Push alert celular offline (D6)**
   - Cron Ana-Food monitora último heartbeat WhatsApp Business (via WA Web injection)
   - Se >2h sem heartbeat E loja deveria estar fechada → push pro dono via OneSignal/Expo
   - Texto: "Atenção: WhatsApp do Caribe pode estar offline. Mensagem de ausência não está respondendo clientes."

---

### 2.4 React no Electron — network-first + cache (D5)

**Service Worker** (Workbox):

```js
// public/sw.js (atualizar existing)
import { precacheAndRoute, NetworkFirst, CacheFirst } from 'workbox';

// Network-first pra app shell (index.html, assets)
registerRoute(
  ({ request }) => request.mode === 'navigate' || request.destination === 'script',
  new NetworkFirst({
    cacheName: 'app-shell',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30d
    ],
  })
);

// Cache-first pra static assets
registerRoute(
  ({ request }) => ['image', 'font', 'style'].includes(request.destination),
  new CacheFirst({ cacheName: 'static-assets' })
);
```

**Electron loadURL:**
```ts
// main/index.ts
if (await isOnline()) {
  win.loadURL('https://app.anafood.vip?__IN_SYSTEM_VIEW=true');
} else {
  // Tenta cache do SW; fallback baseline embutida
  win.loadURL('https://app.anafood.vip?__IN_SYSTEM_VIEW=true');
  // (SW intercepta e serve do cache)
}
```

**Baseline embutida:**
- Build inicial empacotada em `resources/baseline-app/`
- Usada SÓ se SW cache vazio (primeira abertura sem rede)
- Atualizada pelo electron-builder a cada release do app

---

### 2.5 Socket.io + REST fallback (item 5)

**Schema:**

```
Cliente → /v1/whatsapp/inbound (REST, idempotente por msg_id)
Cliente ↔ /ws/electron (Socket.io)
  - events client→server:
    • whatsapp:incoming { msgId, from, body, type, mediaUrl }
    • heartbeat { terminalId, version, online, queueDepth }
    • offline:sync { entityType, payload }
  - events server→client:
    • whatsapp:send { to, content, ctx }
    • config:update { companyId, key, value }
    • cmd:logout-wa | cmd:restart | etc
```

**Reconnect strategy:**

```ts
const socket = io(NUVEM_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  timeout: 20000,
  transports: ['websocket', 'polling'],
});

// Buffer local enquanto socket down
const pendingOutbound = new Queue();
socket.on('disconnect', () => log.warn('socket down — buffering events'));
socket.on('connect', async () => {
  while (pendingOutbound.size > 0) {
    socket.emit('replay', pendingOutbound.dequeue());
  }
});
```

**Inbound REST fallback:**
- Se socket disconnect detectado: msg inbound vai via REST POST com `Idempotency-Key: msg_id`
- Backend deduplica por msg_id (Redis SET 24h)

---

### 2.6 Telemetria (C)

**Sentry** (já provisionado em Ana-Food):
- DSN no `.env`
- `Sentry.init` em main + renderer Electron
- Erros capturados automaticamente
- Custom: `Sentry.startSpan` para latência send→ack

**Métricas custom:**
- Heartbeat enviado a cada 30s com: `queueDepth`, `outboxSize`, `lastSocketReconnect`, `version`, `online`
- Endpoint `/v1/metrics/electron` salva em `electron_metrics` (Postgres)
- Dashboard Grafana/Netdata (já existe) lê dessa tabela

---

## 3. Schema DB — novas tabelas/colunas

```sql
-- companies: feature flag WhatsApp backend
ALTER TABLE companies
  ADD COLUMN whatsapp_backend text NOT NULL DEFAULT 'injection'
    CHECK (whatsapp_backend IN ('injection', 'cloud_api')),
  ADD COLUMN cloud_api_token text,
  ADD COLUMN cloud_api_phone_id text;

-- orders: scheduled_for (cobertura noturna)
ALTER TABLE orders
  ADD COLUMN scheduled_for timestamptz,
  ADD COLUMN source text NOT NULL DEFAULT 'whatsapp'
    CHECK (source IN ('whatsapp', 'cardapio_publico', 'pdv', 'electron'));

-- electron_terminals: registro de terminais
CREATE TABLE electron_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  terminal_name text NOT NULL,
  version text,
  os text,
  last_heartbeat_at timestamptz,
  online boolean DEFAULT false,
  registered_at timestamptz DEFAULT now()
);

-- electron_metrics (time-series)
CREATE TABLE electron_metrics (
  id bigserial PRIMARY KEY,
  terminal_id uuid REFERENCES electron_terminals(id),
  company_id uuid REFERENCES companies(id),
  ts timestamptz DEFAULT now(),
  queue_depth int,
  outbox_size int,
  online boolean,
  socket_uptime_s int,
  msg_sent_count int,
  msg_failed_count int
);
CREATE INDEX electron_metrics_company_ts ON electron_metrics (company_id, ts DESC);

-- whatsapp_messages: dedup + audit
CREATE TABLE whatsapp_messages (
  msg_id text PRIMARY KEY,
  company_id uuid NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_jid text,
  to_jid text,
  body text,
  media_url text,
  type text,
  sent_via text CHECK (sent_via IN ('injection', 'cloud_api')),
  status text DEFAULT 'received',
  created_at timestamptz DEFAULT now()
);
```

---

## 4. Fluxos críticos (sequence)

### 4.1 Msg cliente → resposta humanizada (happy path)

```
Cliente   →  WhatsApp Web (BV)
              │
              │  injection captura
              ▼
          Electron main
              │  dedup msg_id (SQLite cache 24h)
              │  emit whatsapp:incoming (socket)
              ▼
          Ana-Food /ws/electron
              │  POST /v1/whatsapp/inbound interno
              │  agentHarness decide + humaniza + TTS
              │  sendThrottle valida (24h, warmup)
              ▼
          Ana-Food emit whatsapp:send (socket)
              │
              ▼
          Electron main
              │  antiBan client (delay típicocomprimento)
              │  whatsappAdapter.sendText() OR .sendMedia()
              ▼
          WhatsApp Web injection inserta msg
              │  (ou Cloud API HTTP POST se flag=cloud_api)
              ▼
          Cliente recebe
```

### 4.2 Internet cai → comanda offline → reconecta

```
Garçom abre comanda (UI)
    │
    ▼
SQLite INSERT comanda { uuid, mesa, items } + outbox INSERT
    │
    ▼
Outbox processor: navigator.onLine? NO → fica em fila
    │
    ▼  (internet volta 30min depois)
    │
Outbox processor detecta online
    │  ORDER BY id ASC
    │  upsert /comandas { uuid: clientUuid }
    │  Supabase trigger gera number (server-side)
    │  retorna number → SQLite UPDATE comandas SET server_number = X
    │  DELETE outbox
    ▼
UI re-render mostra número server-side
```

### 4.3 Flag flip injection → cloud_api

```
Admin (web)
    │  UPDATE companies SET whatsapp_backend = 'cloud_api',
    │    cloud_api_token = 'XXX', cloud_api_phone_id = 'YYY'
    ▼
Supabase Realtime → Ana-Food → emit config:update {whatsapp_backend}
    ▼
Electron main
    │  whatsappAdapter atual? injection
    │  injection.disconnect() + cleanup
    │  novo adapter = new CloudApiAdapter(token, phoneId)
    │  adapter.onIncoming(handler) reconnect
    ▼
Próxima msg usa Cloud API
```

---

## 5. Tradeoffs e alternativas consideradas

| Decisão | Alternativa | Por quê não |
|---------|-------------|-------------|
| SQLite + outbox manual | PowerSync | Custo $$$, overkill v1, 1 terminal só |
| Network-first React | Bundle estático | Conflito com CF Pages auto-deploy |
| Cloud API atrás de flag | Substituir injection agora | Custo migração + nicho roda injection |
| 1 PC mestre v1 | Multi-terminal sync | CRDT complexity, food service pequeno = 1 PC |
| TS quarentena (JS adapter) | TS total | Risk de port + lib externa raramente atualiza |
| Service Worker + cache | electron-cache-handler | SW funciona em browser também = consistência |

---

## 6. Métricas de validação (pós-implementação)

- **Latência E2E msg:** P50 < 3s, P95 < 6s
- **Outbox sync após reconnect:** 100% sucesso em 60s para fila < 100 itens
- **Crash rate Electron:** < 0.1% sessões
- **Cobertura SQLite backup:** ≥ 95% das horas online com snapshot uploaded
- **Ban rate WhatsApp:** monitorar — meta < 1 por 6 meses (vs 2 em 1 mês com Evolution)
- **Pedidos noturnos capturados:** 100% (todos os msgs noturnas viram pedido agendado OU pedido cardápio)

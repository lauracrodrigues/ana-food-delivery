# Design: Economia de bateria no GPS do entregador

## Visão geral

```
┌──────────────────────────────────────────────────────────┐
│  App Entregador (PWA / DelivererDashboard)               │
│                                                          │
│  punchedIn (localStorage)  ┐                             │
│  orders.length ────────────┤── derives ──► workStatus    │
│                            ┘                             │
│                                                          │
│  useDelivererGPS({ workStatus, enabled })                │
│      ├── battery <15%? → effectiveStatus=offline         │
│      ├── tab hidden?   → effectiveStatus=offline         │
│      └── watchPosition se GPS_CONFIGS[status] != null    │
│             │                                            │
│             ▼                                            │
│      Throttle client: distance<50m && interval<min → skip│
│             │                                            │
│             ▼                                            │
│      RPC update_deliverer_location                       │
└─────────────────────────────────────────────┬────────────┘
                                              │
┌─────────────────────────────────────────────▼────────────┐
│  Postgres                                                │
│                                                          │
│  RPC update_deliverer_location (SECURITY DEFINER)        │
│      ├── ownership: deliverer.user_id = auth.uid()       │
│      ├── throttle server: distance<50m && <30s → skip    │
│      ├── update deliverers.{lat, lng, last_location_at,  │
│      │                       work_status}                │
│      └── retorna { ok, updated, distance_m }             │
│                                                          │
│  Cron / pg_cron                                          │
│      └── cleanup_stale_deliverer_locations()             │
│           (30min sem update → lat=NULL, status=offline)  │
└──────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Banco — `20260518_deliverer_work_status.sql`

- `deliverers.work_status` text NOT NULL DEFAULT 'offline'
- CHECK `('offline','available','delivering')`
- Index parcial `idx_deliverers_work_status` filtrando `WHERE work_status <> 'offline'`
- RPC `update_deliverer_location(p_deliverer_id, p_lat, p_lng, p_work_status, p_battery_level)`
- RPC `cleanup_stale_deliverer_locations()` retorna count

### 2. Hook — `src/hooks/useDelivererGPS.ts`

API:
```ts
useDelivererGPS({
  delivererId: string | null,
  workStatus: 'offline' | 'available' | 'delivering',
  enabled: boolean,
}) → { batteryLow, tabHidden, effectiveStatus }
```

Internals:
- `GPS_CONFIGS` per status (null = sem watchPosition)
- `MIN_INTERVALS_MS` per status (server-side throttle complementar)
- Battery API (`navigator.getBattery()`) — listener `levelchange` + `chargingchange`
- `document.visibilitychange` — pausa quando aba oculta
- `navigator.geolocation.watchPosition` com config dinâmica

### 3. UI — `DelivererDashboard.tsx`

- Botão "Bater ponto" no header → toggle `punchedIn` (localStorage)
- `workStatus` derivado: `!punchedIn → offline | orders>0 → delivering | else → available`
- Badge GPS status: "GPS off" / "💚 Disponível" / "📍 GPS ativo" / "🔋 Bateria baixa"

### 4. Painel loja (futuro / já parcial)

- `KanbanHeader` mostra contador `delivererGpsCount` (entregadores `delivering`)
- Query `deliverer-counts` já filtra `lat IS NOT NULL`
- Após esta mudança, contador deve passar a filtrar `work_status='delivering'` em vez de coords

## Trade-offs

| Decisão | Por quê |
|---------|---------|
| GPS OFF em `available` | Maior economia. Entregador pode estar em casa horas sem pedido. |
| Bater ponto manual | Evita confusão "por que app rastreia se não estou trabalhando?" |
| Throttle dupla (client + server) | Client economiza rede; server protege contra app malformado |
| Battery API ignorada no iOS | iOS Safari não suporta, app continua funcional |
| localStorage `punchedIn` | Estado por device, não global — entregador pode bater ponto em telefones diferentes sem conflito |

## Pontos não-cobertos

- Foreground service Android nativo (PWA limitado, browser pausa em background prolongado)
- Geofencing por torre celular (precisa app nativo)
- Bateria reportada ao servidor (campo previsto na RPC, mas UI ainda não envia)

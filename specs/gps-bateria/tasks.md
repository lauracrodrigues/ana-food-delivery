# Tasks: Economia de bateria GPS entregador

## Fase 1 — Banco

- [x] Migration `20260518_deliverer_work_status.sql`
  - [x] Coluna `work_status` + CHECK constraint
  - [x] Index parcial `idx_deliverers_work_status`
  - [x] RPC `update_deliverer_location` com ownership + throttle
  - [x] RPC `cleanup_stale_deliverer_locations` (30min)
- [x] Aplicado em produção via psql direto

## Fase 2 — App entregador

- [x] Hook `useDelivererGPS` (`src/hooks/useDelivererGPS.ts`)
  - [x] Config dinâmica de `watchPosition`
  - [x] Battery API listener + pausa <15%
  - [x] Visibility API listener
  - [x] Throttle client (distância + intervalo)
  - [x] Chama RPC `update_deliverer_location`
- [x] Integrar em `DelivererDashboard.tsx`
  - [x] Estado `punchedIn` em localStorage
  - [x] `workStatus` derivado de `punchedIn` + `orders.length`
  - [x] Botão "Bater ponto" no header
  - [x] Badge visual do GPS status

## Fase 3 — Specs OpenSpec

- [x] `specs/gps-bateria/proposal.md`
- [x] `specs/gps-bateria/design.md`
- [x] `specs/gps-bateria/tasks.md`

## Fase 4 — Melhorias futuras

- [x] Cron job no PM2 do bot chamando `cleanup_stale_deliverer_locations` a cada 5min
- [x] Painel loja: contador online deve usar `work_status='delivering'` (não só coords)
- [ ] Reportar `battery_level` na RPC (campo já previsto)
- [ ] Notificação push pro entregador quando bateria <15% durante entrega
- [ ] Histórico de pontos: tabela `deliverer_shifts` (bateu ponto X, encerrou Y) → relatório horas trabalhadas
- [ ] Geofencing região da loja (auto-status sem app aberto) — requer app nativo

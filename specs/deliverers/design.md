# Design Técnico — Entregadores

## Banco
- Tabela `deliverers`: id, company_id, name, phone, active, created_at
- Coluna `deliverer_id` (UUID, nullable) na tabela `orders`

## Fluxo
1. Usuário clica "Avançar" em card "Pronto" (delivery)
2. `OrderCard` detecta: status=ready + type=delivery → chama `onAssignDeliverer(order)`
3. `AssignDelivererDialog` abre com lista de entregadores ativos
4. Usuário seleciona → confirma
5. Mutation: update `orders.deliverer_id` + update status → "delivering"
6. Abre WhatsApp Web com mensagem pré-preenchida para o entregador

## Componentes
- `pages/Deliverers.tsx` — CRUD
- `components/orders/AssignDelivererDialog.tsx` — modal seleção
- `OrderCard`: novo prop `onAssignDeliverer`
- `KanbanColumn`: passa `onAssignDeliverer`
- `OrdersKanban`: query deliverers + mutation assign + WA message

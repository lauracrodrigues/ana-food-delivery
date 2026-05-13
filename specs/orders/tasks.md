# Tasks: Orders

## Implementado ✅

- [x] Kanban base com colunas de status
- [x] Realtime via Supabase WebSocket
- [x] Drag and drop entre colunas
- [x] Modal de detalhes do pedido
- [x] Notificação sonora (toggle por usuário)
- [x] Busca por número/nome/telefone
- [x] Cancelamento com motivo
- [x] Auto-arquivamento via cron job backend (worker.js)
- [x] Colunas visíveis configuráveis (por usuário em profiles.preferences)
- [x] Pedido manual (ManualOrderSidebar — Sheet 80vw)
- [x] Numeração de pedidos: sequential e daily com horário de reset
- [x] Impressão automática ao aceitar pedido (QZ Tray)
- [x] Filtro archived (status !== 'archived' no frontend)
- [x] Config pessoal de som/colunas separada da config da empresa

## Pendente / Backlog

- [ ] Exportar pedidos do dia para CSV/PDF
- [ ] Filtro por período (hoje, ontem, semana)
- [ ] Integração rastreamento de entregador
- [ ] Relatório de tempo médio por status
- [ ] Multi-seleção de pedidos para ação em lote (cancelar/arquivar múltiplos)

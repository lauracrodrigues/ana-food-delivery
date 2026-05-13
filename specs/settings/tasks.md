# Tasks: Settings

## Implementado ✅

- [x] Config da empresa em `store_settings` (upsert por company_id)
- [x] Toggle loja aberta/fechada
- [x] Aceite automático de pedidos
- [x] Tempo de entrega e retirada configurável
- [x] Alerta de pedidos em atraso (minutos)
- [x] Numeração de pedidos: sequential e daily
- [x] Horário de reset da numeração diária
- [x] Horários de funcionamento por dia (`BusinessHoursConfig`)
- [x] Config de impressão por setor (QZ Tray)
- [x] Preferências pessoais em `profiles.preferences` (`useUserPreferences`)
- [x] Som de notificação por usuário (não mais por empresa)
- [x] Colunas visíveis no kanban por usuário
- [x] Sidebar state persistido via cookie
- [x] Fix do double req.json() na Edge Function api-settings
- [x] Fix do mapeamento camelCase → snake_case na Edge Function

## Pendente / Backlog

- [ ] Selecionar arquivo de som personalizado (upload)
- [ ] Preview do som ao selecionar
- [ ] Config de layout de impressão por empresa
- [ ] Reset de numeração manual (sem esperar meia-noite)
- [ ] Histórico de alterações de config (audit log)

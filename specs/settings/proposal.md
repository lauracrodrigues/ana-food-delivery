# Spec: Settings (Configurações)

## Problema
Cada empresa tem configurações operacionais diferentes (tempo de entrega, aceite automático). Cada usuário tem preferências pessoais de interface (som, colunas visíveis). Os dois tipos de config estavam misturados na mesma tabela.

## Objetivo
Separar config da empresa (compartilhada) de preferências pessoais do usuário (isoladas por user_id), garantindo persistência independente.

## Escopo

### In Scope
- Config da empresa (`store_settings`): loja aberta, aceite automático, tempo de entrega/retirada, alerta de atraso, numeração de pedidos
- Preferências pessoais (`profiles.preferences`): som, som escolhido, colunas visíveis, impressora pessoal, impressão automática
- Horários de funcionamento por dia da semana (`companies.schedule`)
- Config de impressão por setor (caixa, cozinha1, cozinha2, copa_bar)
- Tema visual (claro/escuro) por usuário
- Paleta de cores por empresa

### Out of Scope
- Configuração de planos/billing (ver spec billing)
- Configuração de usuários e permissões (ver spec users)

## Referências
- `src/pages/Settings.tsx`
- `supabase/functions/api-settings/`
- `src/hooks/useUserPreferences.ts`
- `src/components/settings/BusinessHoursConfig.tsx`

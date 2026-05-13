# Regras Globais — AnaFood

> Estas regras são OBRIGATÓRIAS. Toda implementação deve respeitá-las.

## Arquitetura

- ✅ Arquitetura modular — sem arquivos gigantes (max 300 LOC)
- ✅ Nunca duplicar regras de negócio entre frontend e Edge Function
- ✅ Reutilizar services/hooks existentes antes de criar novo
- ✅ Separar UI (pages/components) de lógica (hooks/Edge Functions)
- ❌ Acoplamento circular proibido
- ❌ Lógica de negócio em componentes React proibida

## Banco de Dados

- ✅ Toda tabela de negócio tem `company_id` e RLS
- ✅ Queries sempre escopadas por `company_id`
- ✅ Migrations versionadas com timestamp
- ✅ `DEFAULT '{}'::jsonb` (não `DEFAULT "{}"`)
- ❌ Consultas globais sem escopo de tenant proibidas
- ❌ SQL em strings concatenadas (usar parâmetros sempre)

## Segurança

- ✅ RLS ativo em todas as tabelas
- ✅ Validação de payload em Edge Functions
- ✅ Rate limit: 100 req/min por IP
- ✅ Secrets somente em variáveis de ambiente
- ❌ `service_role` key no frontend proibida
- ❌ Confiar em `company_id` do header HTTP sem validação proibida
- ❌ SQL injection: nunca concatenar input de usuário em query

## Multi-Tenant

- ✅ `company_id` em todas as tabelas e queries
- ✅ `queryKey` de React Query inclui `company_id`
- ✅ Canais Realtime com namespace `tabela:{company_id}`
- ❌ Cache compartilhado entre tenants proibido
- ❌ Mistura de dados de empresas diferentes proibida

## Frontend

- ✅ Componentes responsivos (mobile-first)
- ✅ Lazy loading para rotas não-críticas
- ✅ `SplashScreen` para loading de página completa
- ✅ `InlineLoader` para loading de conteúdo interno
- ✅ Optimistic updates para operações frequentes
- ❌ Lógica complexa na UI proibida

## Realtime

- ✅ Namespace obrigatório em canais
- ✅ Cleanup (`removeChannel`) no return do useEffect
- ✅ Filtro explícito por `company_id` além do RLS
- ❌ Canais globais sem isolamento proibidos

## Versionamento de Código

- ✅ Toda modificação de arquivo incrementa versão no comentário do topo
- ✅ Formato: `// NomeArquivo.tsx — v1.2.0`

## OpenSpec Workflow

- ✅ Nova feature = criar spec ANTES de implementar
- ✅ Spec mínimo: proposal.md + tasks.md
- ✅ Feature complexa: + design.md
- ✅ Atualizar tasks.md ao concluir cada item
- ✅ Atualizar SYSTEM_OVERVIEW.md se arquitetura mudar
- ❌ Implementar sem spec para features novas proibido

## IA e Context Engineering

- ✅ Analisar impacto antes de alterar código crítico
- ✅ Documentar decisões não-óbvias em context/
- ✅ Preservar compatibilidade retroativa
- ❌ Remover funcionalidades sem análise de impacto proibido
- ❌ Alterar banco sem migration versionada proibido

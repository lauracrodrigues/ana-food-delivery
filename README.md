# AnaFood — Plataforma SaaS para Restaurantes

Sistema multi-tenant para delivery, balcão, mesa, WhatsApp e gestão de restaurantes.

**Domínio**: anafood.vip  
**Stack**: React + TypeScript + Supabase + Evolution API

## Documentação

- [System Overview](./SYSTEM_OVERVIEW.md) — visão geral da arquitetura
- [Specs (OpenSpec)](./specs/README.md) — especificações de todas as features
- [API Docs](./docs/API_DOCS.md) — endpoints e autenticação
- [Deploy Guide](./docs/DEPLOY_GUIDE.md) — como fazer deploy

## Context Engineering

- [Padrões de Arquitetura](./context/architecture_patterns.md)
- [Padrões de Código](./context/coding_patterns.md)
- [Regras de Negócio](./context/business_rules.md)
- [Regras de Realtime](./context/realtime_rules.md)
- [Regras de Segurança](./context/security_rules.md)
- [Padrões Frontend](./context/frontend_patterns.md)

## Desenvolvimento Local

```bash
npm install
npm run dev
# Acessa: http://localhost:8080
```

## Deploy Produção

```bash
npm run build
# dist/ já é servido pelo nginx em anafood.vip (automático)
```

## Edge Functions

```bash
supabase functions deploy --project-ref jgdyklzrxygvwuhlnbat
```

## Supabase

- **Project ref**: `jgdyklzrxygvwuhlnbat`
- **URL**: `https://jgdyklzrxygvwuhlnbat.supabase.co`
- **Migrations**: `supabase/migrations/`

## Workflow para Novas Features (OpenSpec)

```
SPEC (proposal.md)
  ↓
ANÁLISE (impacto nos módulos existentes)
  ↓
DESIGN (design.md — arquitetura técnica)
  ↓
TASKS (tasks.md — checklist)
  ↓
IMPLEMENTAÇÃO
  ↓
TESTES
  ↓
VALIDAÇÃO
  ↓
UPDATE DOCS + UPDATE SPECS
```

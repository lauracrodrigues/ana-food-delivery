# AnaFood — OpenSpec

Especificações técnicas do sistema SaaS AnaFood seguindo o padrão [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## Estrutura

Cada feature tem sua própria pasta com:

```
specs/<feature>/
  proposal.md   — por que existe, problema que resolve
  design.md     — arquitetura técnica, decisões de design
  tasks.md      — checklist de implementação (passado e futuro)
  tests/        — cenários de teste esperados
```

## Features

| Feature | Status | Descrição |
|---------|--------|-----------|
| [orders](./orders/) | ✅ Produção | Kanban de pedidos em tempo real |
| [customers](./customers/) | ✅ Produção | Gestão de clientes e histórico |
| [products](./products/) | ✅ Produção | Cardápio, produtos e categorias |
| [whatsapp](./whatsapp/) | ✅ Produção | Bot e integração WhatsApp |
| [settings](./settings/) | ✅ Produção | Configurações da loja por empresa/usuário |
| [pos](./pos/) | ✅ Produção | Ponto de venda (PDV) |
| [tables](./tables/) | ✅ Produção | Gestão de mesas |
| [cash-register](./cash-register/) | ✅ Produção | Controle de caixa |
| [billing](./billing/) | ✅ Produção | Assinatura e planos (Stripe) |
| [auth](./auth/) | ✅ Produção | Autenticação multi-tenant |
| [menu](./menu/) | ✅ Produção | Cardápio digital público |
| [company-profile](./company-profile/) | ✅ Produção | Perfil e dados da empresa |
| [users](./users/) | ✅ Produção | Gestão de usuários e permissões |
| [delivery-fees](./delivery-fees/) | ✅ Produção | Taxas de entrega por região |
| [categories](./categories/) | ✅ Produção | Categorias do cardápio |
| [extras](./extras/) | ✅ Produção | Extras e adicionais |
| [payment-methods](./payment-methods/) | ✅ Produção | Métodos de pagamento aceitos |
| [dashboard](./dashboard/) | ✅ Produção | Dashboard com métricas da loja |

## Padrões do Sistema

- **Multi-tenant**: isolamento por `company_id` em todas as tabelas
- **Auth**: Supabase Auth + RLS (Row Level Security)
- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Backend**: Node.js + Supabase Edge Functions (Deno)
- **DB**: PostgreSQL via Supabase (project: `jgdyklzrxygvwuhlnbat`)
- **Deploy**: nginx local → anafood.vip

## Como usar estas specs

Ao solicitar nova feature ou mudança:
1. Criar `specs/<feature>/proposal.md` com o problema e objetivo
2. Definir `design.md` com abordagem técnica antes de implementar
3. Usar `tasks.md` para checar progresso
4. Registrar cenários de teste em `tests/`

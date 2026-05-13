# Spec: Billing (Faturamento)

## Problema
Sistema SaaS precisa monetizar o acesso das empresas clientes com planos e cobrança recorrente.

## Objetivo
Gestão de assinaturas via Stripe com planos, trial, e controle de acesso baseado em status da assinatura.

## Escopo

### In Scope
- Planos de assinatura (mensal/anual)
- Checkout via Stripe
- Webhook Stripe para atualização de status
- Página de sucesso após contratação
- Painel de billing para o cliente ver plano atual e histórico

### Out of Scope
- Faturamento por uso (pay-as-you-go)
- NFe automática
- Split de pagamento

## Referências
- `src/pages/Billing.tsx`
- `src/pages/CheckoutSuccess.tsx`
- Backend: webhook Stripe em `api.anafood.vip/webhook/stripe`

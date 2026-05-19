# Proposal: Catálogo com Modifiers (Marmitaria + Customização)

## Problema

Hoje tudo é tratado como `product`. Para marmitarias, acompanhamentos
(arroz, feijão, mistura, salada) viram produtos com preço R$ 0,00,
gerando poluição visual no cardápio (mostra "+R$ 0,00") e impossibilitando
regras de montagem (escolha 1 mistura, 2 saladas, etc).

## Objetivo

Separar **produto principal** (Marmita Grande/Pequena) de **opções
complementares** (acompanhamentos) com:

- Preço apenas no produto principal
- Itens R$ 0,00 sem mostrar preço na UI
- Itens com adicional → mostra `(+R$ X,XX)`
- Regras min/max de escolha por produto
- Grupos reutilizáveis entre produtos
- Modos rádio/checkbox/quantidade

## Padrão consolidado (food service)

`Product` ←→ `ModifierGroup` (many-to-many com overrides) → `ModifierItem`.
Mesma estrutura usada por iFood, Goomer, Cardápio Web, McDonald's app.

## Escopo

- Backend: 4 tabelas novas + RPCs + RLS multi-tenant
- Painel admin: CRUD modifier_groups + aba "Acompanhamentos" no produto
- Cardápio cliente (PublicMenu): renderização de grupos
- Checkout: snapshot em order_item_modifiers
- Bot WhatsApp: integração no fluxo conversacional

## Fora do escopo (futuro)

- Modifiers com delta negativo ("retirar cebola")
- Modifiers por região (left/right/whole — Domino's)
- Wizard step-by-step com progresso visual

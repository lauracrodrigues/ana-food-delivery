# Spec: Products (Produtos)

## Problema
Cada empresa tem seu próprio cardápio com produtos, categorias, extras e variações de preço.

## Objetivo
CRUD completo de produtos com categorias, extras/adicionais, foto, preço e disponibilidade.

## Escopo

### In Scope
- Produtos por empresa (company_id)
- Categorias hierárquicas
- Extras/adicionais vinculados a produtos
- Foto do produto (upload)
- Ativar/desativar produto sem deletar
- Cardápio digital público por subdomínio

### Out of Scope
- Variações de tamanho complexas (tipo pizza com borda)
- Gestão de estoque/inventário

## Referências
- `src/pages/Products.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Extras.tsx`
- `src/pages/Menu.tsx`
- `src/pages/MenuManagement.tsx`
- `src/pages/PublicMenu.tsx`
- Tabelas: `products`, `categories`, `extras`

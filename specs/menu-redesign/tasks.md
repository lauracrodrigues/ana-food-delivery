# Tasks: Menu Redesign

## FASE 1 — Layout Moderno & UX

### DB Migration
- [ ] Adicionar `products.promotional_price`, `products.badges`, `products.is_featured`
- [ ] Adicionar `companies.instagram`, `companies.avg_delivery_minutes`, `companies.min_order_value`, `companies.rating`
- [ ] Adicionar colunas faltantes em `coupons`
- [ ] RLS: garantir leitura anon nos novos campos

### Header v2
- [ ] Refatorar `MenuHeader.tsx` — logo, nome, status aberto/fechado (de `schedule`)
- [ ] Exibir `avg_delivery_minutes` e `delivery_fee`
- [ ] Botão WhatsApp (já tem link em `companies.whatsapp`)
- [ ] Botão Instagram (novo campo)
- [ ] Rating visual se preenchido

### Produtos — Badges e Preço Promo
- [ ] Criar `ProductCard.tsx` extraído de `MenuProducts.tsx`
- [ ] Exibir `promotional_price` com preço original riscado e desconto %
- [ ] Renderizar badges como chips coloridos (popular, new, promo, happy_hour, vegan, spicy)
- [ ] Atualizar `ProductEditDialog.tsx` no admin: campos badges (multiselect) e promotional_price

### Categorias Sticky
- [ ] Refatorar `MenuCategories.tsx` — sticky abaixo do header
- [ ] Scroll horizontal com snap
- [ ] IntersectionObserver: ativa categoria conforme seção visível
- [ ] Click → scroll suave até `#section-{categoryId}`

### Busca Inteligente
- [ ] Input de busca no header (ícone lupa, expande ao clicar)
- [ ] Client-side: filtra produtos por nome + descrição com debounce 300ms
- [ ] Ao buscar: esconde seções normais, mostra grid de resultados flat
- [ ] Botão X para limpar busca

### Seções de Destaque
- [ ] Criar `MenuSections.tsx` com scroll horizontal por seção
- [ ] Seção "Em Promoção" — produtos com `promotional_price`
- [ ] Seção "Mais Vendidos" — produtos com badge 'popular'
- [ ] Seção "Novidades" — produtos com badge 'new'
- [ ] Renderizar só seções que têm produtos

### Ocultar Indisponíveis
- [ ] No `loadMenuData()`: filtrar `available_weekdays` no lado servidor
- [ ] Remover coluna "Indisponível" — produto some completamente

### Carrinho Mobile
- [ ] Criar `CartBottomBar.tsx` — barra fixa no rodapé (mobile < lg)
- [ ] Click abre Sheet de baixo para cima com itens do carrinho
- [ ] Desktop (>= lg): manter layout lateral atual
- [ ] Atualizar `PublicMenu.tsx` para renderizar o componente correto por viewport

### ProductAddModal v2 (visual)
- [ ] Imagem do produto mais proeminente (full-width no topo)
- [ ] Cabeçalho dos grupos mais moderno (ícone, pill de regra)
- [ ] Extras com imagem (se disponível no futuro)
- [ ] Animação suave ao selecionar extras

---

## FASE 2 — Conversão & Cupons

### Sistema de Cupons
- [ ] Criar `CouponInput.tsx` no checkout
- [ ] Função `validateCoupon()` — verifica todas as regras (active, uses, validity, value, time, days)
- [ ] Aplicar desconto no total do pedido
- [ ] Incrementar `coupon_uses.uses_count` ao finalizar pedido
- [ ] Toast de sucesso/erro com detalhe do cupom
- [ ] Criar `CouponsManager.tsx` no admin (CRUD de cupons)

### Upsell
- [ ] No carrinho: sugerir 1-3 produtos relacionados (por categoria)
- [ ] "Adicionar ao carrinho" direto da sugestão (sem abrir modal se não tem extras)

### Valor Mínimo
- [ ] Validar `companies.min_order_value` antes de mostrar botão "Finalizar"
- [ ] Exibir barra de progresso "Faltam R$ X para pedido mínimo"

### Checkout Multi-step
- [ ] Refatorar `MenuCheckout.tsx` para steps visuais:
  - Step 1: Tipo (entrega/retirada/mesa)
  - Step 2: Endereço (se delivery)
  - Step 3: Cupom + pagamento
  - Step 4: Confirmação + resumo

---

## FASE 3 — Conta do Cliente

### Auth
- [ ] Login por OTP SMS (Supabase Auth phoneProvider)
- [ ] Login Google OAuth
- [ ] Botão "Entrar" no header (opcional — guest checkout mantido)
- [ ] Salvar sessão em localStorage

### Histórico de Pedidos
- [ ] Tela "Meus Pedidos" — lista por customer_phone
- [ ] Detalhe do pedido (itens, valor, status, data)
- [ ] Botão "Repetir pedido"

### Favoritos
- [ ] Criar tabela `customer_favorites`
- [ ] Ícone de coração em cada produto
- [ ] Tab "Favoritos" na conta

### Endereços Salvos
- [ ] Salvar endereço após primeiro pedido (localStorage ou DB)
- [ ] Sugerir endereço salvo no checkout

---

## FASE 4 — Avançado

### PWA
- [x] `manifest.json` com ícones, theme_color, display standalone
- [x] Service Worker (Workbox) para cache
- [x] Prompt "Adicionar à tela inicial"
- [ ] Push notifications para status do pedido

### Fidelidade
- [x] Criar tabela `loyalty_points` + `loyalty_transactions`
- [x] Regra: X pontos por R$ gasto (configurável por empresa)
- [x] Resgatar pontos como desconto no checkout
- [x] Exibir saldo no perfil do cliente (tab Pontos)

### Analytics
- [x] Registrar add-to-cart e order via `product_events`
- [x] Dashboard no admin: mais adicionados, conversão, pedidos
- [ ] Registrar views de produto (impressões)

### Campanhas
- [ ] Promoção automática por horário (happy hour configurável)
- [ ] Notificação push: "Você tem itens no carrinho!"

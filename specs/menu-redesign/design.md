# Design: Menu Redesign

## Arquitetura Geral

```
PublicMenu.tsx (root state)
  ├── MenuHeader v2          — logo, status, info, social, busca
  ├── MenuBanners            — já existe, manter
  ├── MenuSections           — NOVO: mais vendidos / novidades / promoção
  ├── MenuCategoriesSticky   — categorias fixas no topo + auto-scroll
  ├── MenuProductsGrid       — grid por seção (cada categoria = seção)
  │     └── ProductCard v2   — badge, promo price, desconto %
  ├── ProductAddModal v2     — extras modernos (já existe, melhorar visual)
  ├── CartBottomBar (mobile) — NOVO: barra fixa no rodapé mobile
  ├── CartDrawer (desktop)   — carrinho lateral
  ├── MenuCheckout v2        — cupom + multi-step claro
  └── OrderTracking          — já existe, mínimas mudanças
```

---

## FASE 1: DB Migration

```sql
-- Badges e destaque nos produtos
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promotional_price NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS badges text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order_override INT DEFAULT NULL;

-- Informações extras da empresa
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS instagram VARCHAR DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_delivery_minutes INT DEFAULT 40,
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT NULL;

-- Coupons: campos faltantes
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_limit NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS valid_days_of_week INT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_start_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_end_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS per_customer_limit INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
```

---

## FASE 1: Componentes

### MenuHeader v2
```
┌─────────────────────────────────────┐
│ [LOGO]  Nome da Empresa             │
│         ● Aberto  ⏱ 30-45 min  ⭐4.8│
│         🚚 R$ 5,00 entrega          │
│                    [WhatsApp] [Insta]│
└─────────────────────────────────────┘
```
- `is_open`: calculado em tempo real a partir de `companies.schedule` (já existe)
- Exibe `avg_delivery_minutes` e `delivery_fee` da tabela companies
- Botões WhatsApp e Instagram linkam para `whatsapp` e `instagram` da empresa

### Badges de Produto
```ts
type Badge = 'popular' | 'new' | 'promo' | 'happy_hour' | 'vegan' | 'spicy';
```
Armazenado em `products.badges text[]`. Renderizado como chips coloridos:
- popular → amber, "Mais Vendido"
- new → blue, "Novidade"  
- promo → red, "Promoção"
- happy_hour → purple, "Happy Hour"
- vegan → green, "Vegano"
- spicy → orange, "Picante"

### ProductCard v2
```
┌──────────────────────────────────┐
│ [BADGE: Mais Vendido]            │
│ ┌──────────┐  Nome do Produto    │
│ │  IMAGEM  │  Descrição curta    │
│ │   120px  │  ~~R$ 29,90~~       │
│ └──────────┘  R$ 24,90 (-16%)  [+]│
└──────────────────────────────────┘
```
- Desconto % calculado: `Math.round((1 - promo/original) * 100)`
- Preço riscado quando `promotional_price` preenchido
- Badge no canto superior esquerdo

### Categorias Sticky
```
[Hambúrguer] [Pizza] [Bebidas] [Açaí] [Sobremesas]  ← sticky top-16
     ↓ scroll
--- Hambúrguer --------- (âncora)
[card] [card] [card]
--- Pizza --------------- (âncora)
[card] [card]
```
- Categorias em `position: sticky; top: 64px` (abaixo do header)
- IntersectionObserver: quando seção entra na viewport → ativa categoria
- Click na categoria → `scrollIntoView({ behavior: 'smooth' })`
- IDs das seções: `section-${category.id}`

### Busca
- Input no header com ícone de lupa
- Busca em: `product.name`, `product.description` (client-side, dados já carregados)
- Ao buscar: esconde seções normais, mostra grid de resultados
- Debounce 300ms

### Ocultar Indisponíveis
- No `loadMenuData()`, filtrar `available_weekdays` no servidor (adicionar ao query)
- Extras: já filtrado em `ProductAddModal` via `isExtraAvailable`
- Sem coluna "Indisponível" — produto some completamente

### Cart Mobile (CartBottomBar)
```
Mobile (< lg):
┌─────────────────────────────────────────┐
│ 🛒 3 itens          Total: R$ 87,90 [→] │  ← fixed bottom
└─────────────────────────────────────────┘
  → clique abre Drawer de baixo para cima
```
Desktop (>= lg): mantém sidebar atual (CartDrawer)

### Seções de Destaque
Ordem na home:
1. Banners rotativos (já existe)
2. `MenuSections`: **Promoções** (products com promotional_price) + **Mais Vendidos** (products com badge 'popular') + **Novidades** (badge 'new')
3. Categorias sticky + grid por seção

---

## FASE 2: Sistema de Cupons

### Validação no Checkout
```ts
async function validateCoupon(code: string, companyId: string, cartTotal: number): Promise<CouponResult>
```
Verifica em `coupons`:
- `is_active`, `company_id`
- `uses_count < max_uses` (ou max_uses null)
- `valid_until >= now()`
- `min_order_value <= cartTotal`
- `valid_days_of_week` inclui dia atual
- `valid_start_time..valid_end_time` (se definido)

### Aplicação
- Campo "Código de cupom" no checkout
- Botão "Aplicar"
- Toast de sucesso/erro
- Desconto mostrado no resumo do pedido
- Total recalculado antes de enviar

---

## FASE 3: Conta do Cliente

### Auth Approach
- Login por **OTP SMS via Supabase Auth** (telefone)
- Opcional: Google OAuth
- Guest checkout permanece (não obriga login)
- Sessão salva em localStorage: `anafood_customer_${companyId}`

### Tabelas Necessárias
```sql
CREATE TABLE customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone VARCHAR NOT NULL,
  company_id UUID REFERENCES companies(id),
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
Histórico de pedidos: usar tabela `orders` existente filtrada por `customer_phone`

---

## FASE 4: PWA

### manifest.json
- `name`, `short_name`, `icons` (192px, 512px), `display: standalone`
- `start_url`: `/${subdomain}` ou `/`
- `theme_color`: primary color da empresa (variável CSS)

### Service Worker (Workbox)
- Cache estático: JS/CSS/fonts
- Cache de imagens: stale-while-revalidate
- Offline fallback: página simples "sem conexão"

### Push Notifications
- Supabase Realtime → status do pedido → notificação push via `showNotification()`
- Pede permissão após primeiro pedido concluído

---

## Convenções de Arquivo

```
src/components/menu/
  MenuHeader.tsx          (v2 — refatorar existente)
  MenuCategories.tsx      (v2 — sticky + IntersectionObserver)
  MenuSections.tsx        (NOVO — promoções, mais vendidos, novidades)
  ProductCard.tsx         (NOVO — extraído de MenuProducts)
  CartBottomBar.tsx       (NOVO — mobile cart)
  CartDrawer.tsx          (NOVO — desktop cart drawer)
  MenuCheckout.tsx        (v2 — cupons + multi-step)
  CouponInput.tsx         (NOVO)
  OrderTracking.tsx       (manter)
  ProductAddModal.tsx     (v2 — melhorar visual dos grupos)

src/components/menu-admin/
  ProductEditDialog.tsx   (adicionar campos: badges, promotional_price, is_featured)
  CouponsManager.tsx      (NOVO — CRUD de cupons no admin)
```

---

## Performance

- Produtos carregados 1x no mount (sem paginação — max ~200 produtos por empresa)
- IntersectionObserver para lazy-load de imagens
- Skeleton loading enquanto carrega
- `loading="lazy" decoding="async"` em todas as imagens (já existe)
- Compressão: imagens servidas pelo Supabase Storage com parâmetros de resize

---

## Compatibilidade com Sistema Atual

- `api-orders` não muda — pedidos chegam igual
- WhatsApp bot continua funcionando (pedidos via WhatsApp não passam pelo cardápio)
- Kanban continua funcionando (orders table não muda)
- QR code de mesa: mantido (`?mesa=N` query param)
- PIX MP: mantido

---

## Prioridade de Implementação

| # | Feature | Impacto | Esforço | Sprint |
|---|---------|---------|---------|--------|
| 1 | DB migration (badges, promo_price, instagram, etc.) | Alto | Baixo | 1 |
| 2 | Header v2 (status, social, info) | Alto | Baixo | 1 |
| 3 | Badge + promotional_price nos produtos | Alto | Baixo | 1 |
| 4 | Categorias sticky + scroll por âncora | Alto | Médio | 1 |
| 5 | Busca inteligente | Alto | Baixo | 1 |
| 6 | Ocultar indisponíveis | Médio | Baixo | 1 |
| 7 | Seções de destaque (promo, popular, new) | Alto | Médio | 1 |
| 8 | CartBottomBar mobile | Alto | Médio | 1 |
| 9 | ProductCard v2 (redesign visual) | Alto | Médio | 1 |
| 10 | Admin: campos badges, promo no ProductEditDialog | Médio | Baixo | 1 |
| 11 | Sistema de cupons (FASE 2) | Alto | Médio | 2 |
| 12 | Upsell / sugestões | Médio | Médio | 2 |
| 13 | Conta do cliente / login | Médio | Alto | 3 |
| 14 | PWA | Médio | Alto | 4 |
| 15 | Fidelidade | Baixo | Alto | 4 |

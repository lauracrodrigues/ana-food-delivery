# Mapeamento — Cardápio Digital Atual AnaFood

Documentação do estado atual antes da reforma estilo Anota.AI.

## 1. Estrutura do cardápio digital

### Arquivo principal
`src/pages/PublicMenu.tsx` — orquestrador (~600 linhas)

### Rotas
- `/` (raiz) — quando URL é `{subdomain}.anafood.vip` → carrega cardápio do subdomain
- `/menu/:subdomain` — rota alternativa
- `/menu/:subdomain/print` — versão PDF impressão
- Detecção via `getSubdomain()` + `getCustomDomain()` em App.tsx

### Componentes do cardápio
- `MenuHeader` — logo, nome, status aberto/fechado, taxa, métricas
- `MenuCategories` — navegação horizontal sticky
- `MenuProducts` — produtos agrupados por categoria com âncoras
- `MenuSections` — seções de destaque (Promoções/Mais Vendidos/Novidades)
- `MenuCart` — carrinho desktop lateral
- `CartBottomBar` — barra inferior mobile + sheet detalhe
- `MenuCheckout` — modal de finalização
- `CustomerSheet` — sheet conta do cliente
- `OrderTracking` — acompanhamento pedido
- `InstallPrompt` — PWA install banner
- `MenuThemeToggle` — dark/light mode
- `TrackingScripts` — GA + FB Pixel
- `ProductCard` — card de produto reusável
- `ProductAddModal` — modal adicionar com extras
- `CartUpsell` — sugestões no carrinho
- `PushOptInBanner` — opt-in notificações push
- `CouponInput` — input cupom no checkout

### Tecnologia
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI)
- React Router DOM
- TanStack Query (React Query)
- Supabase JS Client
- Recharts (charts)
- QRCode lib

## 2. Identificação do cliente

### Mecanismos atuais
- **localStorage** via `useCustomerSession` — salva `{name, phone, lastAddress}`
- **Sem login formal** (sem auth/senha pro cliente final)
- **Lookup por telefone** via `useCustomerLookup` (recém-implementado):
  reconhece cliente em aparelho novo ao digitar telefone

### Hooks relacionados
- `useCustomerSession` — identidade local
- `useFavorites` — favoritos por `(companyId, productId)`
- `useOrderHistory` — histórico local + status via RPC
- `useLoyaltyPoints` — saldo de pontos
- `usePushSubscription` — assinatura push
- `useProductViewTracker` — tracking views

### Storage keys
- `anafood_customer` — sessão do cliente
- `anafood_favorites_{companyId}` — favoritos
- `anafood_history_{companyId}` — histórico pedidos
- `anafood_viewed_products` — produtos vistos (sessão)
- `anafood_menu_theme` — tema dark/light
- `anafood_pwa_dismissed` — PWA dispensado
- `anafood_push_dismissed` — push dispensado
- `anafood_abandoned_cart_sent_{c}_{p}` — cooldown push
- `anafood_order_{companyId}` — pedido ativo

## 3. Cupons e descontos

### Tabela `coupons`
Campos: code, discount_type (percentage/fixed), discount_value, discount_limit,
min_order_value, free_shipping, max_uses, uses_count, valid_until,
valid_days_of_week, valid_start_time, valid_end_time, is_active.

### Componentes
- `CouponInput` — aplicação no checkout
- `Coupons.tsx` — CRUD admin
- `lib/coupon-validator.ts` — `validateCoupon()` + `CouponValidationResult`
- Link compartilhável: `?cupom=CODE` aplica automaticamente

### O que falta (vs Anota.AI)
- Restrição "primeira compra" — coluna não existe
- Restrição "cliente VIP" — sem flag de tier de cliente
- Restrição por categoria/produto específico — não implementado
- Limite por cliente — `max_uses` é só global

## 4. Histórico de pedidos

### Onde
- Tabela `orders` (do sistema completo)
- Filtro por `customer_phone` no DB
- `useOrderHistory` hook combina localStorage + RPC `get_order_tracking`

### Estrutura
- Status mapeados: pending, confirmed, preparing, ready, delivering, delivered, cancelled
- RPC `get_order_tracking(p_order_id uuid)` retorna status + dados resumidos
- Função "Repetir pedido": `handleRepeatOrder(items)` em PublicMenu

## 5. Promoções/Campanhas existentes

### Tabela `campaigns` (já implementada)
- Tipo: percentage / fixed
- Escopo: all / category / products
- Janela: dias da semana, horário, valid_from/until
- Hook `useActiveCampaigns` aplica automaticamente

### O que falta (vs Anota.AI)
- **Cashback** — não existe (nem tabela nem lógica)
- **Compre e Ganhe** — não existe
- **Promoção de forma de pagamento** (ex: 10% no PIX) — pode usar campaigns mas
  falta UI específica no carrinho

## 6. Banners do cardápio

### Tabela `menu_banners`
Campos: image_url, title?, link_type (none/url/whatsapp/category),
link_value, display_order, is_active.

### Onde renderiza
`PublicMenu.tsx` → carrossel rotativo no topo (já implementado).

### Falta
- Período de validade (valid_from/valid_until)
- Subtítulo separado

## 7. Loyalty (pontos)

### Já implementado
- Tabela `loyalty_points`, `loyalty_transactions`
- Configs em `companies`: `loyalty_points_per_real`, `loyalty_min_redeem`, `loyalty_redeem_value`
- Hook `useLoyaltyPoints`, página admin `/loyalty`
- Resgate no checkout

### Diferença pra cashback Anota.AI
- AnaFood usa **pontos** (X pts = R$ Y), Anota.AI usa **cashback** (% direto em R$)
- Pode coexistir ou migrar pra cashback simples

## 8. Estrutura admin

### Painel
- Layout: `DashboardLayout` com `AppSidebar` + `NotificationBell` (sino global)
- Menu items: `menu-items.ts` — Dashboard, PDV, Caixa, Financeiro, Analytics,
  Fidelidade, Marketing, Pedidos, Cardápio, Cadastros (Produtos/Cat/Cupons/Campanhas/...),
  WhatsApp, Configurações

### Páginas relevantes
- `Coupons.tsx` — cupons CRUD
- `Campaigns.tsx` — campanhas happy hour CRUD
- `Loyalty.tsx` — saldos + transações + config
- `Marketing.tsx` — GA + FB Pixel + domínio próprio (dormente)
- `MenuManagement.tsx` — config visual cardápio + print PDF

## 9. PWA + Push

### Implementado
- `manifest.json` + `sw.js` (handlers push, notificationclick, fetch cache)
- VAPID keys configuradas
- Edge function `send-push` — envia via web-push
- Hooks `usePushSubscription`, `useAbandonedCartReminder`
- Notificações de status pedido + carrinho abandonado

## 10. Identidade visual / UI atual

### Padrões shadcn/ui
- Card, Sheet (bottom drawer), Dialog, Tabs, Badge, Button, Input
- ScrollArea, Toast, Skeleton, RadioGroup, Switch
- Lucide React icons

### Tema
- Tailwind dark mode class strategy
- Variáveis CSS via `globals.css` / `theme-provider`
- Modo escuro isolado no cardápio público (não vaza pro admin)

---

## GAP ANALYSIS — Briefing Anota.AI vs estado atual

| Parte do briefing | Status atual | Falta |
|---|---|---|
| **1. Menu inferior 4 abas** | Existe CartBottomBar + Sheet conta separados | ❌ Unificar em barra fixa: Início/Pedidos/Promos/Carrinho |
| **2.1 Banner rotativo** | ✅ `menu_banners` | Adicionar valid_from/until + subtítulo |
| **2.2 Promoções destaque** | ✅ Seção em `MenuSections` (badge popular) | Melhorar visual (foto grande, % desconto badge) |
| **2.3 Mais pedidos automático** | ❌ Hoje é manual via `badges.popular` | ✅ Calcular via SQL agg sobre orders 30d |
| **2.4 Pedir novamente** | Parcial — botão em `CustomerSheet` | Adicionar seção dedicada na home |
| **2.5 Categorias** | ✅ `MenuCategories` sticky | OK |
| **2.6 Produtos por categoria** | ✅ `MenuProducts` | OK |
| **3. Tela Pedidos dedicada** | Tab dentro de `CustomerSheet` | Promover pra aba principal do menu inferior |
| **4.1 Cupons (lista)** | ✅ Aplica no checkout | ❌ Lista pública pra ver disponíveis |
| **4.2 Cashback** | Loyalty pontos existe | ❌ Implementar cashback (R$ direto) ou converter |
| **4.3 Compre e Ganhe** | ❌ Não existe | ❌ Criar tabela + UI + lógica carrinho |
| **5. Carrinho melhorado** | Banner promo? Cupom? | Adicionar banner pagamento + progresso campanhas |
| **6. Perfil loja** | `MenuHeader` mostra | ❌ Página dedicada com mapa |
| **7. DB** | Cupons + Campanhas + Loyalty | ❌ Cashback config, compre_e_ganhe |
| **8. Admin** | Coupons + Campaigns + Loyalty | ❌ Compre e Ganhe + (opcional) cashback config |
| **9. Regras negócio** | Maioria implementada | Cashback estorno + cupom 1ª compra |

---

## ORDEM DE IMPLEMENTAÇÃO

Fase 1 — **Menu inferior 4 abas** (estrutura nova, base de tudo)
Fase 2 — **Home reformulada** (mais pedidos auto + pedir novamente + visual destaque)
Fase 3 — **Tela Promos dedicada** (cupons listáveis + cashback)
Fase 4 — **DB + lógica Cashback** (tabela cashback_balances, regra config, debit/credit hooks)
Fase 5 — **Compre e Ganhe** (DB + admin + UI carrinho)
Fase 6 — **Carrinho melhorado** (banner pagamento + progresso campanhas)
Fase 7 — **Perfil da loja** (página dedicada com mapa)
Fase 8 — **Regras refinadas** (cupom 1ª compra, estorno cashback)

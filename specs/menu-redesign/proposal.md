# Spec: Menu Redesign — Cardápio Digital Moderno

## Problema

O cardápio digital atual funciona mas está aquém dos padrões de mercado (iFood, Rappi). Problemas:
- Header sem informações essenciais (horário, tempo de entrega, Instagram)
- Cards de produto sem preço promocional, badges visuais, destaque
- Categorias não ficam fixas durante scroll — UX ruim em mobile
- Sem busca
- Produtos indisponíveis aparecem como "desativados" em vez de sumirem
- Sem seções de destaque na home (mais vendidos, novidades, promoções)
- Carrinho desktop-only — no mobile ocupa toda a tela ou fica escondido
- Sem sistema de cupons no checkout
- Sem histórico de pedidos para o cliente
- Sem PWA

## Objetivo

Transformar o cardápio em experiência moderna, rápida e orientada a conversão — semelhante a grandes apps de delivery, porém mais leve.

## Fases

### FASE 1 — Layout Moderno & UX (Prioridade Máxima)
Alto impacto, sem dependências externas, implementação imediata.

- Header renovado com todas as informações do estabelecimento
- Cards de produto modernos com badges, preço promo, desconto %
- Categorias fixas (sticky) com scroll horizontal e auto-scroll por seção
- Busca inteligente (nome, descrição, categoria)
- Ocultar completamente produtos/extras indisponíveis
- Seções de destaque na home (mais vendidos, novidades, promoção)
- Modal do produto redesenhado (imagem grande, extras modernos, qty)
- Carrinho mobile como bottom bar + drawer lateral no desktop

### FASE 2 — Conversão & Cupons
- Sistema de cupons completo no checkout (%, fixo, frete grátis)
- Sugestões de upsell no carrinho
- Combo automático por produto
- Valor mínimo de pedido por empresa
- Checkout multi-step mais claro

### FASE 3 — Conta do Cliente
- Login por telefone (OTP SMS) ou Google
- Histórico de pedidos por cliente
- Favoritos (produtos e endereços)
- Repedir pedido anterior
- Perfil salvo (nome, telefone, endereços)

### FASE 4 — Avançado (Long-term)
- PWA (instalar como app, notificações push)
- Sistema de fidelidade (pontos, cashback, níveis)
- Campanhas automáticas (abandono carrinho, happy hour)
- Analytics do cardápio (mais clicados, taxa conversão)
- Galeria de imagens por produto/grupo
- Avaliação do pedido pelo cliente

## Stakeholders
- Clientes finais (quem faz pedido)
- Operadores da loja (vê pedidos chegando)
- Dono do negócio (quer mais vendas)

## Restrições
- Não quebrar fluxo atual de pedidos (compatibilidade com kanban, bot WhatsApp)
- Manter suporte a QR code de mesa
- Não exigir auth para fazer pedido (guest checkout permanece)
- Performance: mobile 3G deve carregar em <3s

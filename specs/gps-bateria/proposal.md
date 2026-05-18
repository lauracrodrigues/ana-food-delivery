# Proposal: Economia de bateria no GPS do entregador

## Problema

App entregador (PWA `DelivererDashboard`) ligava `watchPosition` com `enableHighAccuracy: true` o tempo todo durante a sessão, mesmo quando:

- Entregador estava em casa sem pedidos
- Não havia atribuição ativa
- App ficava em background

Consumo estimado: **10-15% de bateria/hora** apenas com GPS.

## Objetivo

Reduzir consumo de bateria do app entregador para **~0%/h em idle** e **3-5%/h durante entrega**, sem perder visibilidade do motoboy no painel da loja.

## Estratégia

GPS contextual em 3 estados:

| Estado | Quando | GPS | Bateria |
|--------|--------|-----|---------|
| `offline` | App fechado / não bateu ponto | OFF | 0 |
| `available` | Bateu ponto, sem pedido (em casa, etc.) | **OFF** | 0 |
| `delivering` | Tem pedido atribuído | ON alta acurácia, 30s, 50m throttle | ~3-5%/h |

Princípio: **GPS só quando há trabalho real**.

## Pontos chave

1. **Bater ponto manual** — entregador declara disponibilidade. Sem isso, app não rastreia.
2. **Auto-detecção de pedidos** — quando `orders.length > 0`, sobe pra `delivering`.
3. **Safeguards automáticos** — bateria <15% ou aba oculta → pausa GPS.
4. **Servidor confiável** — RPC `update_deliverer_location` valida ownership e aplica throttle servidor-side (50m / 30s).
5. **Cleanup automático** — `cleanup_stale_deliverer_locations()` zera coords + marca offline após 30min de inatividade.

## Impacto

- Bateria: redução estimada de 80-90% no consumo do GPS
- Servidor: menos updates inúteis (sem GPS quando não há entrega)
- UX painel loja: contador "X/Y online" reflete melhor a realidade (only quem está realmente trabalhando)

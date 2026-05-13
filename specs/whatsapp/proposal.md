# Spec: WhatsApp

## Problema
Marmitarias e restaurantes recebem pedidos via WhatsApp. Processar mensagens manualmente é inviável em horário de pico.

## Objetivo
Bot de atendimento automático via WhatsApp que recebe pedidos, confirma com o cliente, e cria o pedido no sistema — sem intervenção humana na conversa.

## Escopo

### In Scope
- Recebimento de mensagens via Evolution API (webhook)
- Agente LLM com tools (OpenAI padrão, multi-provider)
- Cardápio dinâmico em 3 camadas: cardapio_dia → products → hardcoded
- Memória de preferências do cliente (customers.preferences JSONB)
- Histórico de conversa (msg_history)
- Toggle robô ligado/desligado por empresa
- Mensagens de status automáticas (pedido aceito, pronto, etc.)
- Chat de monitoramento no painel (WhatsAppChat)

### Out of Scope
- Suporte a grupos WhatsApp
- Mídia (fotos, áudio, documentos) além de texto

## Stakeholders
- Dono do negócio (configura e monitora)
- Operadores (monitoram conversas)
- Clientes (interagem via WhatsApp)

## Referências
- `src/pages/WhatsApp.tsx` — config do robô no painel
- `src/pages/WhatsAppChat.tsx` — monitor de conversas
- Backend: `src/agentHarness.js`, `src/providers/llmProvider.js`
- Evolution API: `evo.anafood.vip`

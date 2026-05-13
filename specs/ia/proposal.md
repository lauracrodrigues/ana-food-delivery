# Spec: IA Contextual

## Status: 🚧 PARCIALMENTE IMPLEMENTADO (somente WhatsApp bot)

## O que já existe
- `agentHarness.js` — agente LLM para atendimento WhatsApp
- `llmProvider.js` — abstração multi-provider (OpenAI, Anthropic, Gemini, Groq)
- `memoriaService.js` — memória de preferências do cliente
- `tokenMonitor.js` — monitoramento de custo

## O que falta

### 1. IA no Dashboard (análise de dados)
- Insights automáticos: "Suas vendas caíram 20% na terça-feira comparado à semana passada"
- Sugestões: "Produto X está esgotando rápido, considere aumentar o preço"
- Previsão de demanda baseada em histórico

### 2. IA para Automações
- Regras com condições em linguagem natural: "Se cliente não comprou em 30 dias, enviar mensagem"
- Classificação automática de feedback de clientes

### 3. IA para Cardápio
- Sugestão de preço baseado em custo + margem desejada
- Identificar produtos mais rentáveis vs menos vendidos

### 4. Context Engineering Persistente
- Histórico de decisões arquiteturais salvo
- IA ciente do estado atual do sistema ao sugerir mudanças

## Design Técnico

### Dashboard Insights
```
StoreDashboard carrega dados
    ↓
Edge Function analisa via LLM (Claude Haiku - baixo custo)
    ↓
Retorna insights em JSON estruturado
    ↓
Frontend exibe cards de insight
```

### Custo por Feature IA
- Insights (leitura de dados): ~$0.001 por análise (Haiku)
- Bot WhatsApp: ~$0.002 por conversa (GPT-4o-mini)
- Análise complexa: ~$0.01 por relatório (Claude Sonnet)

## Prioridade
Alta para insights de dashboard — alto valor percebido pelo usuário.

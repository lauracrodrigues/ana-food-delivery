# Proposal: Ecossistema Ana Food (sem fiscal)

**Status:** approved
**Owner:** Tarcisio
**Created:** 2026-05-29
**Last updated:** 2026-05-29

---

## Problema

4 repos com lógica duplicada e arquitetura frágil:

- `Ana-Food` (backend SaaS + cérebro)
- `ana-food-delivery` (UI React)
- `ana-food-print` (Electron desktop, impressão)
- `auto-reply` (Electron com cérebro duplicado + injeção WhatsApp)

**Duplicações:**
- Cérebro: `Ana-Food` ≈ `auto-reply` (lógica de resposta WhatsApp)
- Impressão: `ana-food-print` ≈ `auto-reply` (cliente ESC-POS)

**Riscos atuais:**
1. Evolution API (Baileys) já causou **2 banimentos** de número WhatsApp do Caribe
2. Operação 100% dependente de internet — queda derruba PDV/mesas/comandas
3. Cobertura noturna inexistente — cliente manda msg, ninguém responde
4. Manutenção em 2 cérebros = bugs dobrados, contexto fragmentado

---

## Objetivo

Consolidar em **um ecossistema único**:

1. **Cérebro único** na nuvem (`Ana-Food`) — fonte de verdade
2. **UI única** (`ana-food-delivery`) — renderiza no navegador (admin) e Electron (operacional)
3. **App desktop único** (casca `ana-food-print` + injeção WhatsApp do `auto-reply`)
4. **Sem Evolution** — WhatsApp Web injection local + plano B Cloud API atrás de flag
5. **Offline-first** para mesas, comandas, pedidos delivery, caixa
6. **Cobertura noturna** via mensagem ausência nativa + cardápio digital agendado

---

## Critérios de sucesso

### Funcionais
- [ ] Mensagem entra no WhatsApp do Caribe → resposta humanizada em ≤6s (P95)
- [ ] Internet cai 1h → comanda/pedido/caixa continuam editáveis
- [ ] Conexão volta → outbox sincroniza 100% sem perda de dado
- [ ] Cliente manda msg às 23h → recebe ausência + link cardápio; pedido entra como "agendado"
- [ ] Próximo banimento (se ocorrer): chave Cloud API alternada em <10min sem code change

### Não-funcionais
- [ ] 0 código duplicado de cérebro (auto-reply aposentado)
- [ ] 0 código duplicado de impressão
- [ ] Sentry/telemetria mede latência, fila offline, queda socket desde dia 1
- [ ] Backup SQLite incremental 1x/h para Supabase Storage
- [ ] Build React no Electron = network-first + cache (auto-update via CF Pages mantido)

---

## Decisões centrais (com mitigações)

### D1. WhatsApp Web injection é primário, Cloud API é plano B
- **Razão:** mercado nicho (Anota AI etc) opera assim, custo zero por msg
- **Risco aceito:** ban inevitável longo prazo
- **Mitigação obrigatória:** camada `whatsappAdapter` com 2 backends (`injection` | `cloudApi`). Feature flag por `company_id`. Migração sem code change.

### D2. PC da loja NÃO protege ban — anti-ban comportamental sim
- Throttle, quietHours, janela 24h, typing humano, dedup msg_id
- Server-side decide + client-side executa
- "250 msg/dia" é mito; foco é **padrão**, não volume

### D3. Offline-first com propriedade de dado por terminal
- Comanda/pedido/caixa = **pertencem ao terminal local durante operação**
- Admin web NÃO edita essas entidades ao vivo (só cardápio/preço/config)
- Elimina conflito distribuído sem precisar de CRDT/PowerSync no v1
- 1 PC mestre por loja no v1 (realidade do food service pequeno)

### D4. UUID cliente como chave de sync + número humano local
- UUID gerado no cliente → idempotência total
- `order_number` gerado local (prefixo terminal + sequência)
- Trigger Supabase `next_order_number` vira tolerante (aceita UUID, número server-side é secundário)

### D5. React no Electron = network-first + cache
- Quando online: carrega de `app.anafood.vip` (mantém CF Pages auto-deploy)
- Quando offline: serve do cache (Service Worker)
- Baseline build embutida só para primeira abertura sem rede
- Sem bundle estático puro = sem conflito com auto-deploy

### D6. Sem migração TS gradual — quarentena
- Injeção WhatsApp = módulo JS isolado, interface tipada
- Todo código NOVO é TS
- Sem débito "será JS ou TS?"

---

## Não-objetivos

- Emissão fiscal (NFC-e/NF-e) — documento separado
- Multi-terminal por loja v1 — Fase C futura com PowerSync
- Substituir WhatsApp Web por Cloud API agora — só atrás de flag pronta
- CRDT/Yjs — over-engineering para o problema atual

---

## Stakeholders

- **Tarcisio:** product owner, decisão final
- **Caribe Restaurante:** cliente piloto (company_id `739786f0-abda-41e4-975a-9ddac451a33b`)
- **Mais Sistem:** desenvolvimento

---

## Riscos residuais

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Ban WhatsApp injeção | Alta (longo prazo) | Alto | Cloud API atrás de flag pronta |
| Outbox trava por RLS | Média | Médio | Dead-letter queue + alerta admin |
| SSD do PC da loja falha | Baixa | Alto | Backup SQLite 1x/h → Supabase Storage |
| Celular do dono offline noite | Média | Médio | Push alert se >X horas offline |
| WhatsApp Web atualiza DOM | Alta | Médio | Spike dia 0 + monitoring + injection isolada |
| Estimativa offline subestimada | Alta | Médio | Buffer 2-3x; entregar Fase A primeiro |

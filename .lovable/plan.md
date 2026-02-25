

# Painel de Conversas WhatsApp - Ana Food

## Resumo

Criar uma pagina completa de conversas WhatsApp dentro do sistema, com layout estilo chat (lista de contatos a esquerda, mensagens a direita), permitindo responder mensagens e controlar o agente de IA por conversa ou globalmente.

## Arquitetura

```text
+-----------------------------------------------+
|  /whatsapp-chat                                |
+---------------+-------------------------------+
| Lista de      |  Area de Mensagens            |
| Conversas     |                               |
|               |  [Nome do contato]  [Pausar]  |
| [Busca...]    |                               |
|               |  msg recebida                 |
| Contato 1  *  |        msg enviada            |
| Contato 2     |  msg recebida                 |
| Contato 3     |                               |
|               |  +-------------------------+  |
| [Pausar Todos]|  | Digite sua mensagem... |>|  |
+---------------+-------------------------------+
```

## Componentes da Solucao

### 1. Nova Edge Function: `whatsapp-chat`
Proxy para endpoints da Evolution API de chat:
- `action: 'findChats'` -> `POST /chat/findChats/{instance}` - lista conversas
- `action: 'findMessages'` -> `POST /chat/findMessages/{instance}` - busca mensagens de um contato
- `action: 'sendText'` -> reutilizar logica do `whatsapp-send` (enviar mensagem)

### 2. Migracoes de Banco de Dados

**Tabela `whatsapp_agent_control`** - controle de pausa do agente:
- `id` uuid PK
- `company_id` uuid NOT NULL
- `phone` text (null = controle global)
- `session_name` text NOT NULL
- `is_paused` boolean DEFAULT false
- `paused_at` timestamptz
- `paused_by` uuid
- `created_at`, `updated_at`
- Unique constraint em (company_id, session_name, phone)
- RLS: tenant isolation via `get_user_company_id`

Isso substitui o uso dos campos `atendimento_lock` / `atendimento_lock_at` da tabela `customers` por uma abordagem mais flexivel e dedicada.

### 3. Nova Pagina: `src/pages/WhatsAppChat.tsx`
Layout responsivo com dois paineis:
- **Painel esquerdo**: lista de conversas vindas da Evolution API (`findChats`), com busca, ultimo preview de mensagem, badge de nao lidas, e botao "Pausar Todos"
- **Painel direito**: mensagens do contato selecionado (`findMessages`), campo de resposta, botao de pausar/retomar agente para aquele contato

### 4. Componentes
- `src/components/whatsapp-chat/ChatSidebar.tsx` - lista de conversas com busca
- `src/components/whatsapp-chat/ChatMessages.tsx` - area de mensagens com scroll
- `src/components/whatsapp-chat/ChatInput.tsx` - campo de texto + envio
- `src/components/whatsapp-chat/AgentControlBar.tsx` - barra com status e botao pausar/retomar

### 5. Rota e Navegacao
- Adicionar rota `/whatsapp-chat` no `App.tsx`
- Atualizar sidebar em `AppSidebar.tsx`: mudar item "WhatsApp" para submenu com "Configuracoes" (`/whatsapp`) e "Conversas" (`/whatsapp-chat`)

### 6. Real-time (Supabase Realtime)
- Subscribe na tabela `msg_history` para receber novas mensagens em tempo real (quando o webhook do n8n insere mensagens la)
- Atualizar a lista de conversas e mensagens automaticamente

## Detalhes Tecnicos

### Edge Function `whatsapp-chat/index.ts`
```text
POST body: { action, instanceName, remoteJid, message }

action = 'findChats':
  -> POST evo.anafood.vip/chat/findChats/{instanceName}
  
action = 'findMessages':
  -> POST evo.anafood.vip/chat/findMessages/{instanceName}
     body: { where: { key: { remoteJid } } }
     
action = 'sendText':
  -> POST evo.anafood.vip/message/sendText/{instanceName}
     body: { number, text, options: { delay: 1200 } }
```

### Controle do Agente
- Ao pausar: inserir/atualizar registro em `whatsapp_agent_control` com `is_paused = true`
- O fluxo n8n/webhook deve consultar essa tabela antes de processar mensagens automaticamente
- Pausa global: registro com `phone = NULL` (aplica a toda a sessao)
- Pausa individual: registro com `phone = '5511...'`

### SQL Migration
```sql
CREATE TABLE whatsapp_agent_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  session_name text NOT NULL,
  phone text,
  is_paused boolean DEFAULT false,
  paused_at timestamptz,
  paused_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, session_name, COALESCE(phone, '__global__'))
);

ALTER TABLE whatsapp_agent_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_agent_control" ON whatsapp_agent_control
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));
```

### Fluxo de Dados
1. Usuario abre `/whatsapp-chat`
2. Frontend busca sessoes ativas de `whatsapp_config`
3. Para a primeira sessao conectada, chama `findChats` via edge function
4. Ao selecionar um contato, chama `findMessages` para carregar historico
5. Subscribe Realtime em `msg_history` para atualizacoes em tempo real
6. Ao enviar mensagem, chama `sendText` e insere na `msg_history`
7. Botoes de pausar/retomar fazem upsert em `whatsapp_agent_control`

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/whatsapp-chat/index.ts` | Criar - proxy Evolution API chat |
| `src/pages/WhatsAppChat.tsx` | Criar - pagina principal do chat |
| `src/components/whatsapp-chat/ChatSidebar.tsx` | Criar - lista de conversas |
| `src/components/whatsapp-chat/ChatMessages.tsx` | Criar - area de mensagens |
| `src/components/whatsapp-chat/ChatInput.tsx` | Criar - input de resposta |
| `src/components/whatsapp-chat/AgentControlBar.tsx` | Criar - controle do agente |
| `src/App.tsx` | Modificar - adicionar rota `/whatsapp-chat` |
| `src/components/layout/AppSidebar.tsx` | Modificar - submenu WhatsApp |
| `supabase/config.toml` | Modificar - adicionar config da nova edge function |
| Migration SQL | Criar tabela `whatsapp_agent_control` |


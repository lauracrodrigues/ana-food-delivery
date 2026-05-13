# Schema do Banco de Dados — AnaFood

> PostgreSQL via Supabase | 43 migrations | ~45 tabelas | RLS ativo

## Grupos de Tabelas

### Auth & Tenant
| Tabela | Descrição | Chave Principal |
|--------|-----------|-----------------|
| `auth.users` | Supabase Auth (gerenciado) | `id UUID` |
| `profiles` | Dados extras do usuário | `id = auth.users.id` |
| `user_roles` | Roles por empresa | `user_id + company_id` |
| `companies` | Tenants (empresas) | `id UUID` |
| `plans` | Planos SaaS | `id UUID` |
| `audit_logs` | Log de alterações | `id UUID` |

### Pedidos
| Tabela | Descrição |
|--------|-----------|
| `orders` | Pedidos delivery/retirada/mesa |
| `order_status_history` | Histórico de mudanças de status + latências |
| `pending_sales` | Carrinhos abandonados |

### PDV & Mesas
| Tabela | Descrição |
|--------|-----------|
| `checks` | Comandas do PDV |
| `check_items` | Itens da comanda |
| `check_payments` | Pagamentos da comanda |
| `tables` | Mesas físicas |
| `table_areas` | Áreas/salões |
| `waiters` | Garçons/atendentes |
| `cash_registers` | Controle de caixa |
| `cash_movements` | Movimentações do caixa |
| `pdv_settings` | Config do PDV por empresa |

### Cardápio
| Tabela | Descrição |
|--------|-----------|
| `products` | Produtos com preço, categoria, disponibilidade |
| `categories` | Categorias com display_order |
| `extras` | Adicionais/extras |
| `group_extras` | Grupos de adicionais |
| `product_group_links` | M2M: produto ↔ grupo de extras |
| `promotions` | Promoções por período/dia |
| `promotion_products` | M2M: promoção ↔ produto |
| `menu_banners` | Banners do cardápio digital |

### Clientes & WhatsApp
| Tabela | Descrição |
|--------|-----------|
| `customers` | Clientes com RFM e preferências |
| `msg_history` | Histórico de conversas WhatsApp |
| `whatsapp_config` | Config do bot por empresa |
| `whatsapp_status_messages` | Templates de mensagem por status |
| `whatsapp_agent_control` | Pausar agente por contato |

### Operacional
| Tabela | Descrição |
|--------|-----------|
| `store_settings` | Config da loja por empresa |
| `delivery_fees` | Taxas de entrega por região |
| `coupons` | Cupons de desconto |
| `coupon_uses` | Uso de cupons |

## Campos Obrigatórios em Toda Tabela de Negócio

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
company_id  UUID NOT NULL REFERENCES companies(id),
created_at  TIMESTAMPTZ DEFAULT now(),
updated_at  TIMESTAMPTZ DEFAULT now()
```

## Perfil de Usuário (`profiles`)

```sql
id              UUID PRIMARY KEY REFERENCES auth.users(id)
company_id      UUID REFERENCES companies(id)
full_name       TEXT
role            TEXT  -- legado, usar user_roles
preferences     JSONB DEFAULT '{}'::jsonb  -- prefs pessoais UI
```

## Store Settings (`store_settings`)

```sql
id                          UUID PK
company_id                  UUID UNIQUE (1:1 com empresa)
store_open                  BOOLEAN DEFAULT true
auto_accept                 BOOLEAN DEFAULT false
sound_enabled               BOOLEAN DEFAULT true
delivery_time               INTEGER DEFAULT 30  -- minutos
pickup_time                 INTEGER DEFAULT 45
alert_time                  INTEGER DEFAULT 10
debounce_ms                 INTEGER DEFAULT 10000
notification_sound          TEXT
visible_columns             JSONB
auto_print                  BOOLEAN
printer_settings            JSONB
order_numbering_mode        TEXT DEFAULT 'sequential'
order_numbering_reset_time  TIME DEFAULT '00:00'
```

## Pedido (`orders`)

```sql
id               UUID PK
company_id       UUID NOT NULL
order_number     TEXT
status           TEXT  -- pending|preparing|ready|delivering|completed|cancelled|archived
customer_name    TEXT
customer_phone   TEXT
items            JSONB  -- [{product_id, name, price, qty, obs}]
total            NUMERIC
delivery_fee     NUMERIC
discount         NUMERIC
type             TEXT  -- delivery|pickup|table
address          JSONB
payment_method   TEXT
notes            TEXT
source           TEXT  -- whatsapp|manual|pos
table_id         UUID
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

## Views

| View | Propósito |
|------|-----------|
| `v_cash_register_summary` | Saldo e movimentações por caixa |
| `companies_staff_view` | Empresas com contagem de staff |

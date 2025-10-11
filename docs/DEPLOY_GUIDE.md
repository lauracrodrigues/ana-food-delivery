# 🚀 Guia Completo de Deploy - Cloudflare Worker

## Pré-requisitos

✅ Conta no Cloudflare (gratuita)  
✅ Domínio `anafood.vip` configurado no Cloudflare  
✅ Acesso ao terminal/linha de comando  
✅ API_TOKEN do Supabase (mesmo que está nos Secrets)  

---

## 📦 Opção 1: Deploy Automatizado (Recomendado)

### 1️⃣ Abra o Terminal

```bash
cd cloudflare
```

### 2️⃣ Torne o Script Executável

```bash
chmod +x deploy.sh
```

### 3️⃣ Execute o Deploy

```bash
./deploy.sh
```

O script vai:
- ✅ Instalar o Wrangler CLI (se necessário)
- ✅ Fazer login no Cloudflare
- ✅ Fazer deploy do Worker
- ✅ Configurar o API_TOKEN

### 4️⃣ Quando Solicitado

Ao executar, você verá:
```
🔑 Configuração do API_TOKEN
IMPORTANTE: Você precisa configurar o mesmo token que está nos Supabase Secrets

Deseja configurar o API_TOKEN agora? (s/n):
```

Digite **`s`** e pressione Enter.

Então digite o **mesmo API_TOKEN** que está configurado no Supabase.

---

## 📦 Opção 2: Deploy Manual

### 1️⃣ Instalar Wrangler CLI

```bash
npm install -g wrangler
```

### 2️⃣ Login no Cloudflare

```bash
wrangler login
```

Isso abrirá uma página no navegador para autenticação.

### 3️⃣ Deploy do Worker

```bash
cd cloudflare
wrangler deploy
```

### 4️⃣ Configurar API_TOKEN

```bash
wrangler secret put API_TOKEN
```

Digite o **mesmo token** que está nos Supabase Secrets quando solicitado.

---

## 🌐 Configuração do DNS

### 1️⃣ Acesse o Cloudflare Dashboard

https://dash.cloudflare.com

### 2️⃣ Selecione o Domínio `anafood.vip`

### 3️⃣ Vá em **DNS** > **Records**

### 4️⃣ Adicione um Novo Record

Clique em **"Add record"** e preencha:

```
Tipo: CNAME
Nome: api
Destino: anafood-api-gateway-production.workers.dev
Proxy Status: Proxied (nuvem laranja ativada)
TTL: Auto
```

**Configuração Visual:**
```
┌─────────────────────────────────────────────────┐
│ Type: CNAME                                     │
│ Name: api                                       │
│ Target: anafood-api-gateway-production.workers.dev │
│ Proxy: 🟠 (orange cloud - Proxied)            │
└─────────────────────────────────────────────────┘
```

### 5️⃣ Clique em **Save**

### 6️⃣ Aguarde Propagação

A propagação do DNS leva **5-10 minutos**.

---

## ✅ Testando o Deploy

### 1️⃣ Aguarde 5-10 minutos após configurar o DNS

### 2️⃣ Teste com cURL

```bash
curl -X GET "https://api.anafood.vip/api-orders?action=list&company_id=SEU_COMPANY_ID" \
  -H "X-API-Token: SEU_API_TOKEN"
```

### 3️⃣ Ou use o Postman

Importe a collection: `postman/AnáFood-API.postman_collection.json`

Altere a variável `base_url` para:
```
https://api.anafood.vip
```

---

## 🔍 Troubleshooting

### ❌ Erro: "wrangler: command not found"

**Solução:**
```bash
npm install -g wrangler
```

### ❌ Erro ao fazer login

**Solução:**
```bash
wrangler logout
wrangler login
```

### ❌ DNS não resolve (após 10+ minutos)

**Causas comuns:**
1. Proxy não está ativado (deve estar 🟠 laranja)
2. Nome do record está errado (deve ser `api`, não `api.anafood.vip`)
3. Target está errado

**Verificar:**
```bash
nslookup api.anafood.vip
```

Deve retornar IPs do Cloudflare (não do Workers).

### ❌ 401 Unauthorized

**Causa:** API_TOKEN não está configurado ou está incorreto

**Solução:**
```bash
cd cloudflare
wrangler secret put API_TOKEN
```

Digite o **mesmo token** do Supabase.

### ❌ 500 Internal Server Error

**Causa:** Erro no Worker ou no Supabase Edge Function

**Debug:**
```bash
wrangler tail
```

Isso mostra os logs em tempo real.

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
cd cloudflare
wrangler tail
```

### Ver Métricas no Dashboard

https://dash.cloudflare.com → Workers & Pages → anafood-api-gateway-production

---

## 🔄 Atualizações Futuras

Sempre que modificar o código:

```bash
cd cloudflare
wrangler deploy
```

Os secrets (API_TOKEN) **não** precisam ser reconfigurados.

---

## 🎯 URLs Importantes

| Ambiente | URL |
|----------|-----|
| **Supabase Direto** | `https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders` |
| **Cloudflare Gateway** | `https://api.anafood.vip/api-orders` |

**Recomendação:** Use o Cloudflare Gateway em produção (rate limiting, CORS, analytics).

---

## 📚 Recursos Adicionais

- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [API Documentation](./API_DOCS.md)
- [Quick Start Guide](./QUICK_START.md)

---

## 🆘 Precisa de Ajuda?

Se algo não funcionou:
1. ✅ Verifique que seguiu **todos** os passos
2. ✅ Aguardou 10 minutos após configurar DNS
3. ✅ Conferiu que o API_TOKEN está correto
4. ✅ Rodou `wrangler tail` para ver logs

Se ainda tiver problemas, consulte o troubleshooting ou entre em contato.

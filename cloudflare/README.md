# Cloudflare Worker - API Gateway

## 🚀 Deploy

### 1. Instalar Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login no Cloudflare

```bash
wrangler login
```

### 3. Criar KV Namespace

```bash
wrangler kv:namespace create "ANALYTICS"
```

Copiar o ID gerado e atualizar em `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "ANALYTICS"
id = "seu_namespace_id_aqui"
```

### 4. Configurar Secret (API Token)

```bash
wrangler secret put API_TOKEN
# Colar o mesmo token usado no Supabase Secret
```

### 5. Deploy para Produção

```bash
wrangler deploy
```

---

## 🌐 Configurar DNS

No painel do Cloudflare:

1. Ir em **DNS** → **Records**
2. Adicionar registro:
   - **Tipo:** `CNAME`
   - **Nome:** `api`
   - **Destino:** `anafood-api-gateway-production.workers.dev` (ou o nome do seu worker)
   - **Proxy Status:** ✅ Proxied (ícone laranja)

Aguardar propagação DNS (pode levar alguns minutos).

---

## 🧪 Testar

```bash
# Dar permissão de execução ao script
chmod +x ../scripts/test-api.sh

# Executar testes
../scripts/test-api.sh YOUR_API_TOKEN YOUR_COMPANY_ID
```

---

## 📊 Monitorar

### Ver Logs em Tempo Real

```bash
wrangler tail
```

### Ver Analytics

```bash
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID --prefix="analytics:"
```

### Exemplo de Query de Analytics

```bash
# Ver últimas 10 requisições
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID --prefix="analytics:" | head -10
```

---

## 🔧 Configurações

### Rate Limiting

Editar em `worker.ts`:

```typescript
const rateLimitResult = await checkRateLimit(
  env.ANALYTICS, 
  clientIP,
  100,  // máximo de requisições
  60    // janela em segundos
);
```

### CORS

Editar em `wrangler.toml`:

```toml
ALLOWED_ORIGINS = "https://anafood.vip,https://app.anafood.vip"
```

---

## 📝 Comandos Úteis

```bash
# Ver logs
wrangler tail

# Atualizar secret
wrangler secret put API_TOKEN

# Ver variáveis
wrangler secret list

# Rollback para versão anterior
wrangler rollback

# Ver estatísticas
wrangler deployments list
```

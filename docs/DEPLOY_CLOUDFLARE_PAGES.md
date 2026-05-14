# Deploy do Frontend — Cloudflare Pages

Guia passo-a-passo pra migrar o frontend da VPS pra Cloudflare Pages com auto-deploy a cada push.

## Por que mudar pra Pages

- **$0** no free tier (500 builds/mês, bandwidth ilimitado)
- **Edge global** (300+ POPs) — site abre em < 100ms em qualquer lugar
- **SSL automático** — sem precisar de certbot/nginx
- **Wildcard `*.anafood.vip`** nativo (multi-tenant por subdomain)
- **Auto-deploy** a cada push no `main`
- **Preview deploys** automáticos em PRs (URL única pra revisar antes de mergear)
- **Rollback 1 clique** no dashboard

## VPS continua sendo útil pra:

- Cloudflare Worker API gateway (`cloudflare/`)
- Scripts cron / processos background
- Bots/integrações que precisam estado persistente

---

## Setup (uma vez só)

### 1. Conectar repo no Cloudflare Pages

1. Login: <https://dash.cloudflare.com>
2. Menu lateral → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Autorizar acesso ao GitHub (escopo: `lauracrodrigues/ana-food-delivery`)
4. Selecionar repo `ana-food-delivery`

### 2. Configurar build

| Campo | Valor |
|---|---|
| **Project name** | `anafood` |
| **Production branch** | `main` |
| **Framework preset** | None (ou Vite, se aparecer) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (vazio) |
| **Node version** (variável) | `20` |

**Environment variables** (opcional — chaves Supabase já estão hardcoded no `client.ts` mas é boa prática):

```
NODE_VERSION = 20
VITE_SUPABASE_URL = https://jgdyklzrxygvwuhlnbat.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = <chave anon — pode ser pública>
```

Clicar **Save and Deploy**. Primeiro build leva ~2-3 min.

### 3. Validar deploy preview

Cloudflare gera URL tipo `https://anafood.pages.dev`. Testar:

- [ ] Cardápio público abre: `https://anafood.pages.dev/<subdomain>`
- [ ] Login admin funciona
- [ ] PWA instala (banner aparece)
- [ ] Imagens/assets carregam
- [ ] Pedido cria e aparece no admin

### 4. Domínio custom (anafood.vip)

No projeto Pages → **Custom domains** → **Set up a custom domain**:

1. **Apex domain**: `anafood.vip`
2. **Wildcard** (multi-tenant): `*.anafood.vip`

Cloudflare cria os CNAMEs automaticamente. Se DNS já tá no Cloudflare, propaga em segundos. Se tá em outro provider, seguir instruções do dashboard.

### 5. Ajustar Worker API gateway (se necessário)

Worker continua em `api.anafood.vip` (rota separada). Verificar `wrangler.toml`:

```toml
routes = [
  { pattern = "api.anafood.vip/*", zone_name = "anafood.vip" }
]
```

Frontend em `anafood.vip` e `*.anafood.vip` chama API em `api.anafood.vip`. CORS já deve estar liberado no Worker.

### 6. Desligar nginx/PM2 na VPS (depois de validar)

Após confirmar que tudo funciona no Pages:

```bash
# Parar serviço atual do frontend na VPS
pm2 stop anafood-frontend  # ou systemctl, ou nginx
# Manter Worker API ativo se rodar lá
```

---

## Fluxo de trabalho dia-a-dia

### Deploy normal (production)
```bash
git push origin main
# Cloudflare Pages detecta, builda, publica em ~1-2 min
# URL produção atualiza: anafood.vip
```

### Preview de PR
```bash
git checkout -b feature/x
# ...edita...
git push origin feature/x
gh pr create
# Cloudflare comenta no PR com URL única tipo:
# https://abc123.anafood.pages.dev
```

### Rollback
Dashboard → projeto → **Deployments** → escolher versão antiga → **Rollback to this deployment**.

---

## Arquivos de config no repo

- `public/_redirects` — SPA fallback (todas as rotas → `index.html`)
- `public/_headers` — cache control + security headers
- Build command já em `package.json` (`npm run build`)

---

## Troubleshooting

**Build falha por env var ausente**
→ Setar `NODE_VERSION=20` e `VITE_SUPABASE_*` no dashboard Pages → Settings → Environment variables.

**Rota `/cardapio/xyz` dá 404 ao recarregar**
→ Verificar se `public/_redirects` tá no repo e foi pro build.

**PWA não instala depois do deploy**
→ Verificar `https://anafood.vip/manifest.json` (status 200) e `https://anafood.vip/sw.js` (sem cache forte).

**Build estourou minutos no free tier**
→ Free = 500 builds/mês. Se passou, paga $5/mês (Workers Paid) por 5000 builds.

**Logs do build**
→ Dashboard → projeto → **Deployments** → clicar no deploy → ver log completo.

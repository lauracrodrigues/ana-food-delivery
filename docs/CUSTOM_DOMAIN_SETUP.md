# Domínio Próprio para Clientes — Setup VPS

Guia técnico para o admin do AnaFood configurar o nginx da VPS Homehost
como proxy reverso para domínios próprios dos clientes (Caminho C).

## Arquitetura

```
Cliente cardapio.pizzariatal.com.br
   │ CNAME
   ▼
vps.anafood.vip (216.22.5.44 — VPS Homehost)
   │ nginx proxy_pass + Host header
   ▼
ana-food-delivery.maissistem.workers.dev (Cloudflare Worker)
   │ lê Host header → resolve company por custom_domain
   ▼
React app + cardápio público da empresa correta
```

## Setup inicial (uma vez)

### 1. Pré-requisitos na VPS

```bash
# Verifica nginx instalado
nginx -v

# Instala certbot se não tiver
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Server block catch-all

Crie `/etc/nginx/sites-available/anafood-custom-domains`:

```nginx
# Catch-all para domínios próprios de clientes do AnaFood
# Adicione server_name conforme novos clientes ativarem domínio
server {
  listen 80;
  listen [::]:80;

  # IMPORTANT: server_name vazio aqui — certbot adiciona conforme ativa
  server_name _;

  # Redireciona HTTP → HTTPS (depois que SSL emitido)
  if ($host ~ ^(cardapio\..+|pedidos\..+|menu\..+)$) {
    return 301 https://$host$request_uri;
  }

  location / {
    return 404;
  }
}

# HTTPS — substitua server_name pelos domínios ativos
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;

  # Adicione domínios conforme clientes ativam (ex: cardapio.cliente.com.br)
  server_name PLACEHOLDER_DOMAIN_LIST;

  # certbot vai inserir ssl_certificate e ssl_certificate_key aqui

  # Proxy para Cloudflare Worker
  location / {
    proxy_pass https://ana-food-delivery.maissistem.workers.dev;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host $host;
    proxy_ssl_server_name on;
    proxy_ssl_name ana-food-delivery.maissistem.workers.dev;

    # Timeouts razoáveis
    proxy_connect_timeout 30s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Buffers
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
  }
}
```

Habilita:

```bash
sudo ln -s /etc/nginx/sites-available/anafood-custom-domains /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Adicionando novo cliente

Quando cliente salva domínio em `/marketing` no painel:

### 1. DNS (cliente faz)

Cliente cria no DNS dele:
```
cardapio.empresa-cliente.com.br   CNAME   vps.anafood.vip
TTL: 3600
```

### 2. Você adiciona no nginx + emite SSL (admin AnaFood)

```bash
# Adiciona domínio à lista do server_name
sudo nano /etc/nginx/sites-available/anafood-custom-domains
# Edite linha "server_name" do bloco 443, adicionando o domínio:
#   server_name cardapio.empresa-cliente.com.br outros.domínios.aqui;

# Testa config
sudo nginx -t

# Emite certificado Let's Encrypt — certbot edita o block automaticamente
sudo certbot --nginx -d cardapio.empresa-cliente.com.br

# Reload nginx
sudo systemctl reload nginx
```

### 3. Marca como ativo no DB

```sql
UPDATE companies
SET custom_domain_status = 'active',
    custom_domain_verified_at = NOW(),
    custom_domain_error = NULL
WHERE custom_domain = 'cardapio.empresa-cliente.com.br';
```

OU cliente pode clicar "Verificar agora" no painel (rota chama API).

## Renovação automática SSL

Certbot já configura auto-renovação. Confira:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## Removendo domínio

Quando cliente cancela:

```bash
# Remove cert
sudo certbot delete --cert-name cardapio.empresa-cliente.com.br

# Remove server_name do nginx config
sudo nano /etc/nginx/sites-available/anafood-custom-domains
# Apaga o domínio da linha server_name

sudo nginx -t && sudo systemctl reload nginx
```

```sql
UPDATE companies SET custom_domain = NULL, custom_domain_status = NULL
WHERE id = 'company-uuid';
```

## Troubleshooting

**Erro: "domain ownership verification failed"**
→ CNAME não propagou. Aguarde mais e tente `dig cardapio.empresa.com.br`

**Erro: HTTP 502 Bad Gateway no nginx**
→ Worker fora do ar. Verifica `https://ana-food-delivery.maissistem.workers.dev`

**Cliente vê "Estabelecimento não encontrado"**
→ `custom_domain_status` no DB não está 'active'. Confirme valor.

**Loop de redirect ou cardápio errado aparecendo**
→ Host header não chegou correto. Confere `proxy_set_header Host $host` no nginx.

## Limites práticos

- VPS Homehost vira ponto único — se cair, todos domínios custom caem (anafood.vip continua via CF)
- ~50 domínios na VPS sem precisar tunar nginx workers
- Cliente perde edge global do CF — latência extra ~30ms via VPS SP

## Próximo passo (futuro)

Quando tiver receita justificando, migrar pra **Cloudflare for SaaS** (Business plan $200/mês + $0.10/hostname) — SSL automático, edge global, sem VPS no caminho.

#!/bin/bash

# Script de Deploy Automatizado - Cloudflare Worker
# AnáFood API Gateway

set -e  # Exit on error

echo "🚀 AnáFood API Gateway - Deploy Automation"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  Wrangler CLI não encontrado. Instalando...${NC}"
    npm install -g wrangler
    echo -e "${GREEN}✅ Wrangler instalado com sucesso!${NC}"
else
    echo -e "${GREEN}✅ Wrangler já está instalado${NC}"
fi

echo ""
echo "📋 Verificando configuração..."

# Check if wrangler.toml exists
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}❌ Erro: wrangler.toml não encontrado${NC}"
    echo "Execute este script da pasta cloudflare/"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo wrangler.toml encontrado${NC}"

# Check if user is logged in
echo ""
echo "🔐 Verificando autenticação Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você não está autenticado. Iniciando login...${NC}"
    wrangler login
else
    echo -e "${GREEN}✅ Já autenticado no Cloudflare${NC}"
fi

# Deploy the worker
echo ""
echo "📦 Fazendo deploy do Worker..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deploy realizado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao fazer deploy${NC}"
    exit 1
fi

# Configure API_TOKEN secret
echo ""
echo "🔑 Configuração do API_TOKEN"
echo -e "${YELLOW}IMPORTANTE: Você precisa configurar o mesmo token que está nos Supabase Secrets${NC}"
echo ""
read -p "Deseja configurar o API_TOKEN agora? (s/n): " configure_token

if [ "$configure_token" = "s" ] || [ "$configure_token" = "S" ]; then
    echo ""
    echo "Digite o API_TOKEN (ou pressione Ctrl+C para cancelar):"
    wrangler secret put API_TOKEN
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ API_TOKEN configurado com sucesso!${NC}"
    else
        echo -e "${RED}❌ Erro ao configurar API_TOKEN${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Lembre-se de configurar o API_TOKEN mais tarde com:${NC}"
    echo "   wrangler secret put API_TOKEN"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo ""
echo "📍 Próximos passos:"
echo "1. Configure o DNS no Cloudflare:"
echo "   - Tipo: CNAME"
echo "   - Nome: api"
echo "   - Destino: anafood-api-gateway-production.workers.dev"
echo "   - Proxy: Ativado (nuvem laranja)"
echo ""
echo "2. Aguarde 5-10 minutos para propagação do DNS"
echo ""
echo "3. Teste a API:"
echo "   curl https://api.anafood.vip/api-orders?action=list&company_id=SEU_COMPANY_ID \\"
echo "        -H \"X-API-Token: SEU_TOKEN\""
echo ""
echo "📚 Documentação completa: docs/DEPLOY_GUIDE.md"
echo "=========================================="

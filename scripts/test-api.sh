#!/bin/bash

# Script de Teste da API Gateway
# Usage: ./test-api.sh [API_TOKEN] [COMPANY_ID]

set -e

API_URL="https://api.anafood.vip/api-orders"
API_TOKEN="${1:-YOUR_API_TOKEN}"
COMPANY_ID="${2:-YOUR_COMPANY_ID}"

echo "🧪 Testando AnáFood API Gateway"
echo "================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
  local test_name=$1
  local method=$2
  local url=$3
  local data=$4
  
  echo -e "${YELLOW}🔍 Teste: ${test_name}${NC}"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "X-API-Token: $API_TOKEN")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "X-API-Token: $API_TOKEN" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ Sucesso (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Falha (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  
  echo ""
}

# Teste 1: Criar Pedido
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Teste 1: Criar Pedido"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Criar pedido de teste" "POST" "$API_URL" '{
  "action": "create",
  "order": {
    "company_id": "'$COMPANY_ID'",
    "customer_name": "Teste API Gateway",
    "customer_phone": "(11) 99999-9999",
    "total": 50.00,
    "items": [
      {
        "name": "Pizza Margherita",
        "price": 45.00,
        "quantity": 1,
        "observations": "Sem cebola"
      }
    ],
    "type": "delivery",
    "address": "Rua Teste, 123 - Centro",
    "payment_method": "pix",
    "observations": "Teste via API Gateway",
    "delivery_fee": 5.00,
    "estimated_time": 30
  }
}'

# Teste 2: Listar Pedidos
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Teste 2: Listar Pedidos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Listar pedidos" "GET" "${API_URL}?action=list&company_id=${COMPANY_ID}"

# Teste 3: Rate Limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚦 Teste 3: Rate Limiting (105 requisições)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Enviando 105 requisições para testar rate limit...${NC}"

success_count=0
rate_limited_count=0

for i in {1..105}; do
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-API-Token: $API_TOKEN" \
    "${API_URL}?action=list&company_id=${COMPANY_ID}")
  
  if [ "$http_code" -eq 429 ]; then
    ((rate_limited_count++))
  elif [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    ((success_count++))
  fi
  
  # Mostrar progresso a cada 20 requisições
  if [ $((i % 20)) -eq 0 ]; then
    echo "  Progresso: $i/105 (Sucesso: $success_count, Rate Limited: $rate_limited_count)"
  fi
done

echo ""
echo -e "${GREEN}✅ Requisições bem-sucedidas: $success_count${NC}"
echo -e "${RED}🚫 Requisições bloqueadas (429): $rate_limited_count${NC}"

if [ $rate_limited_count -gt 0 ]; then
  echo -e "${GREEN}✅ Rate limiting funcionando corretamente!${NC}"
else
  echo -e "${YELLOW}⚠️  Rate limiting pode não estar configurado${NC}"
fi

echo ""

# Teste 4: Autenticação Inválida
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 Teste 4: Autenticação Inválida"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}🔍 Teste: Token inválido${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-API-Token: INVALID_TOKEN" \
  "${API_URL}?action=list&company_id=${COMPANY_ID}")

if [ "$http_code" -eq 401 ]; then
  echo -e "${GREEN}✅ Autenticação funcionando (HTTP 401)${NC}"
else
  echo -e "${RED}❌ Esperado HTTP 401, recebido: $http_code${NC}"
fi

echo ""

# Teste 5: CORS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Teste 5: CORS Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}🔍 Teste: OPTIONS request${NC}"
cors_headers=$(curl -s -X OPTIONS "$API_URL" -I | grep -i "access-control")

if [ -n "$cors_headers" ]; then
  echo -e "${GREEN}✅ CORS configurado:${NC}"
  echo "$cors_headers"
else
  echo -e "${RED}❌ CORS headers não encontrados${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testes concluídos!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

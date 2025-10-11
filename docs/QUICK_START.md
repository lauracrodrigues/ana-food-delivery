# 🚀 Quick Start - Testar API Agora

## Teste Imediato (Sem Deploy)

Use a URL direta do Supabase para testar agora mesmo:

### 📍 URL Base
```
https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders
```

### 🔑 Headers Obrigatórios

```http
Content-Type: application/json
X-API-Token: SEU_API_TOKEN_AQUI
```

**Onde pegar o API_TOKEN?**
- Está salvo nos Supabase Secrets como `API_TOKEN`
- Se não souber, peça para o administrador do projeto

---

## 📮 Exemplos para Postman

### 1️⃣ Criar Pedido

**POST** `https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders`

**Headers:**
```
Content-Type: application/json
X-API-Token: SEU_API_TOKEN_AQUI
```

**Body (raw JSON):**
```json
{
  "action": "create",
  "order": {
    "company_id": "SEU_COMPANY_ID",
    "customer_name": "João Silva",
    "customer_phone": "11999887766",
    "delivery_address": "Rua Exemplo, 123 - São Paulo/SP",
    "payment_method": "pix",
    "items": [
      {
        "product_id": "uuid-do-produto",
        "product_name": "Pizza Margherita",
        "quantity": 2,
        "unit_price": 45.00,
        "total_price": 90.00
      }
    ],
    "subtotal": 90.00,
    "delivery_fee": 10.00,
    "total": 100.00
  }
}
```

### 2️⃣ Listar Pedidos

**GET** `https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders?action=list&company_id=SEU_COMPANY_ID`

**Headers:**
```
Content-Type: application/json
X-API-Token: SEU_API_TOKEN_AQUI
```

### 3️⃣ Atualizar Status

**POST** `https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders`

**Headers:**
```
Content-Type: application/json
X-API-Token: SEU_API_TOKEN_AQUI
```

**Body:**
```json
{
  "action": "update_status",
  "order_id": "uuid-do-pedido",
  "company_id": "SEU_COMPANY_ID",
  "status": "preparing"
}
```

**Status válidos:** `pending`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `cancelled`

### 4️⃣ Deletar Pedido

**POST** `https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders`

**Headers:**
```
Content-Type: application/json
X-API-Token: SEU_API_TOKEN_AQUI
```

**Body:**
```json
{
  "action": "delete",
  "order_id": "uuid-do-pedido",
  "company_id": "SEU_COMPANY_ID"
}
```

---

## 🔍 Como Obter os IDs Necessários

### Company ID
1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/jgdyklzrxygvwuhlnbat/editor
2. Abra a tabela `companies`
3. Copie o `id` da sua empresa

### Product ID
1. No Supabase Dashboard, abra a tabela `products`
2. Copie o `id` do produto que deseja incluir no pedido

### Order ID (para update/delete)
1. Primeiro crie um pedido
2. Use o `id` retornado na resposta
3. Ou consulte a tabela `orders` no Supabase

---

## ✅ Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_number": 1,
    "status": "pending",
    "customer_name": "João Silva",
    "total": 100.00,
    "created_at": "2025-01-26T10:30:00Z"
  }
}
```

---

## ❌ Erros Comuns

### 401 Unauthorized
```json
{
  "error": "Authentication required: provide Authorization header (JWT) or X-API-Token"
}
```
**Solução:** Verifique se o header `X-API-Token` está correto

### 403 Forbidden
```json
{
  "error": "User does not have access to this company"
}
```
**Solução:** Verifique se o `company_id` está correto

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "details": "company_id is required"
}
```
**Solução:** Verifique se todos os campos obrigatórios estão no payload

---

## 🎯 Próximo Passo

Após testar com sucesso usando a URL do Supabase, siga o guia de deploy do Cloudflare Worker:
👉 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)

Isso permitirá usar a URL mais amigável: `https://api.anafood.vip`

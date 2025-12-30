# 🚀 Quick Start - API AnáFood

## 📍 URL Base

```
https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders
```

## 🔐 Autenticação

Use o **CNPJ** (ou CPF) da empresa como chave de autenticação:

```http
Content-Type: application/json
X-Company-Key: 00111222000133
```

> O CNPJ pode ser enviado com ou sem formatação.

---

## 📮 Exemplos Rápidos

### 1️⃣ Criar Pedido

```bash
curl -X POST \
  https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders \
  -H "Content-Type: application/json" \
  -H "X-Company-Key: SEU_CNPJ_AQUI" \
  -d '{
    "action": "create",
    "order": {
      "customer_name": "João Silva",
      "customer_phone": "11999887766",
      "source": "whatsapp",
      "type": "delivery",
      "payment_method": "pix",
      "address": "Rua Exemplo",
      "address_number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "items": [
        {"name": "Pizza Margherita", "quantity": 2, "price": 45.00}
      ],
      "delivery_fee": 10.00,
      "total": 100.00
    }
  }'
```

### 2️⃣ Listar Pedidos

```bash
curl -X GET \
  "https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders?action=list" \
  -H "Content-Type: application/json" \
  -H "X-Company-Key: SEU_CNPJ_AQUI"
```

### 3️⃣ Atualizar Status

```bash
curl -X POST \
  https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders \
  -H "Content-Type: application/json" \
  -H "X-Company-Key: SEU_CNPJ_AQUI" \
  -d '{
    "action": "update_status",
    "order_id": "UUID_DO_PEDIDO",
    "status": "preparing"
  }'
```

**Status válidos:** `pending`, `confirmed`, `preparing`, `ready`, `delivering`, `completed`, `cancelled`

### 4️⃣ Deletar Pedido

```bash
curl -X POST \
  https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/api-orders \
  -H "Content-Type: application/json" \
  -H "X-Company-Key: SEU_CNPJ_AQUI" \
  -d '{
    "action": "delete",
    "order_id": "UUID_DO_PEDIDO"
  }'
```

---

## 🔍 Como Obter o CNPJ

1. Acesse o Supabase Dashboard
2. Abra a tabela `companies`
3. Copie o valor da coluna `cnpj`

---

## ✅ Resposta de Sucesso (Criar)

```json
{
  "success": true,
  "order": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_number": "001",
    "status": "pending",
    "customer_name": "João Silva",
    "total": 100.00,
    "created_at": "2025-12-30T10:30:00Z"
  }
}
```

---

## ❌ Erros Comuns

| Código | Erro | Solução |
|--------|------|---------|
| 401 | `Empresa não encontrada` | Verifique se o CNPJ está correto |
| 401 | `Autenticação necessária` | Adicione o header `X-Company-Key` |
| 400 | `customer_name é obrigatório` | Inclua o nome do cliente |

---

## 📚 Documentação Completa

👉 [API_DOCS.md](./API_DOCS.md)

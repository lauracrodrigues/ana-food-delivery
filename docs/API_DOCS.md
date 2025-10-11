# AnáFood API Gateway - Documentação

## 🌐 Base URL

```
https://api.anafood.vip
```

---

## 🔐 Autenticação

A API suporta **dois tipos de autenticação**:

### 1. JWT (para frontend interno)
```http
Authorization: Bearer <JWT_TOKEN>
```

### 2. API Token (para integrações externas)
```http
X-API-Token: <YOUR_API_TOKEN>
```

---

## 📦 Endpoints

### 1. Criar Pedido

**Endpoint:** `POST /api-orders`

**Headers Obrigatórios:**
```http
Content-Type: application/json
X-API-Token: <YOUR_TOKEN>  (ou Authorization: Bearer <JWT>)
X-Company-ID: <uuid-da-empresa>
```

**Payload:**
```json
{
  "action": "create",
  "order": {
    "company_id": "uuid-da-empresa",
    "customer_name": "João Silva",
    "customer_phone": "(11) 99999-9999",
    "total": 55.00,
    "items": [
      {
        "product_id": "uuid-produto",
        "name": "X-Burger",
        "price": 25.00,
        "quantity": 2,
        "observations": "Sem cebola"
      }
    ],
    "type": "delivery",
    "address": "Rua X, 123 - Bairro - Cidade/UF",
    "payment_method": "pix",
    "observations": "Entregar rápido",
    "delivery_fee": 5.00,
    "estimated_time": 30
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "uuid-do-pedido",
    "order_number": "001",
    "status": "pending",
    "created_at": "2025-10-11T20:00:00Z",
    "total": 55.00,
    "customer_name": "João Silva"
  }
}
```

**Possíveis Erros:**
- `401` - Token inválido ou ausente
- `403` - Sem permissão para acessar empresa
- `429` - Rate limit excedido (max: 100 req/min por IP)
- `500` - Erro interno do servidor

---

### 2. Listar Pedidos

**Endpoint:** `GET /api-orders?action=list&company_id=<uuid>`

**Headers:**
```http
Authorization: Bearer <JWT>  (ou X-API-Token)
```

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "001",
      "customer_name": "João Silva",
      "total": 55.00,
      "status": "pending",
      "type": "delivery",
      "created_at": "2025-10-11T20:00:00Z"
    }
  ]
}
```

---

### 3. Atualizar Status do Pedido

**Endpoint:** `POST /api-orders`

**Payload:**
```json
{
  "action": "update_status",
  "order_id": "uuid-do-pedido",
  "status": "preparing"
}
```

**Status Válidos:**
- `pending` - Aguardando confirmação
- `confirmed` - Confirmado
- `preparing` - Em preparo
- `ready` - Pronto
- `dispatched` - Saiu para entrega
- `delivered` - Entregue
- `cancelled` - Cancelado

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "status": "preparing",
    "updated_at": "2025-10-11T20:05:00Z"
  }
}
```

---

### 4. Deletar Pedido

**Endpoint:** `POST /api-orders`

**Payload:**
```json
{
  "action": "delete",
  "order_id": "uuid-do-pedido"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Pedido deletado com sucesso"
}
```

---

## 🚦 Rate Limiting

- **Limite:** 100 requisições por minuto por IP
- **Header de resposta:** `X-RateLimit-Remaining`
- **Erro:** `429 Too Many Requests`

**Resposta quando rate limit é excedido:**
```json
{
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

---

## 🔍 Headers de Debug

Todas as respostas incluem headers para tracking:

```http
X-Request-ID: uuid-unico-da-requisicao
X-Response-Time: 150ms
```

---

## 📊 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Recurso criado |
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno |

---

## 🧪 Exemplos de Uso

### cURL

```bash
# Criar pedido
curl -X POST https://api.anafood.vip/api-orders \
  -H "Content-Type: application/json" \
  -H "X-API-Token: YOUR_TOKEN" \
  -d '{
    "action": "create",
    "order": {
      "company_id": "uuid-empresa",
      "customer_name": "Teste API",
      "customer_phone": "(11) 99999-9999",
      "total": 50.00,
      "items": [{"name": "Pizza", "price": 50, "quantity": 1}],
      "type": "delivery",
      "payment_method": "pix"
    }
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('https://api.anafood.vip/api-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Token': 'YOUR_TOKEN',
  },
  body: JSON.stringify({
    action: 'create',
    order: {
      company_id: 'uuid-empresa',
      customer_name: 'João Silva',
      customer_phone: '(11) 99999-9999',
      total: 50.00,
      items: [
        { name: 'Pizza', price: 50, quantity: 1 }
      ],
      type: 'delivery',
      payment_method: 'pix'
    }
  })
});

const data = await response.json();
console.log(data);
```

### Python (Requests)

```python
import requests

response = requests.post(
    'https://api.anafood.vip/api-orders',
    headers={
        'Content-Type': 'application/json',
        'X-API-Token': 'YOUR_TOKEN',
    },
    json={
        'action': 'create',
        'order': {
            'company_id': 'uuid-empresa',
            'customer_name': 'João Silva',
            'customer_phone': '(11) 99999-9999',
            'total': 50.00,
            'items': [
                {'name': 'Pizza', 'price': 50, 'quantity': 1}
            ],
            'type': 'delivery',
            'payment_method': 'pix'
        }
    }
)

print(response.json())
```

---

## 🚀 Setup Inicial

### 1. Obter API Token

Contate o administrador do sistema para obter seu `API_TOKEN`.

### 2. Obter Company ID

O `company_id` é o UUID da empresa no sistema. Pode ser obtido via painel administrativo.

### 3. Testar Conexão

```bash
curl -X GET "https://api.anafood.vip/api-orders?action=list&company_id=YOUR_COMPANY_ID" \
  -H "X-API-Token: YOUR_TOKEN"
```

---

## 📞 Suporte

- **Email:** suporte@anafood.vip
- **Documentação:** https://docs.anafood.vip
- **Status da API:** https://status.anafood.vip

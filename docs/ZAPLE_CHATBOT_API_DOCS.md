# 🤖 Zaple WhatsApp Chatbot API Documentation

### Base URL:
`https://fylexwatches.com/api`

---

## 1. Single Order Track API (Exact Zaple Spec)

Retrieves live tracking details for a specific order using the order ID and customer mobile number.

- **HTTP Method:** `GET`
- **Endpoint:** `/orders/track`
- **Full URL:** `https://fylexwatches.com/api/orders/track?order_id={ORDER_ID}&mobile={MOBILE}`

### Request Query Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `order_id` | `string` | **Yes** | Order Number or Database ID | `ORD-1724683000` |
| `mobile` | `string` | **Yes** | Customer 10-digit or 12-digit mobile number | `916354351080` or `6354351080` |

---

### Example Request:
```http
GET https://fylexwatches.com/api/orders/track?order_id=ORD-1724683000&mobile=916354351080
```

### Success Response (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Order found",
  "data": {
    "order_number": "ORD-1724683000",
    "status": "Shipped",
    "courier": "Delhivery",
    "expected_delivery": "2026-09-05",
    "tracking_number": "FYL10018080"
  }
}
```

### Order Not Found Response (HTTP 404 Not Found):
```json
{
  "success": false,
  "message": "No order found matching the provided order number and mobile number",
  "data": null
}
```

---

## 2. Customer Orders by Mobile API (Multi-Order Lookup)

Fetches all active orders or complete purchase history associated with a customer's mobile number.

- **HTTP Method:** `GET`
- **Endpoint:** `/orders/by-mobile`
- **Full URL:** `https://fylexwatches.com/api/orders/by-mobile?mobile={MOBILE}&type={TYPE}`

### Request Query Parameters:

| Parameter | Type | Required | Description | Options / Default |
| :--- | :--- | :--- | :--- | :--- |
| `mobile` | `string` | **Yes** | Customer mobile number | `6354351080` or `916354351080` |
| `type` | `string` | No | Filter mode | `active` (Default: Pending/Shipped) or `all` |

---

### Example Request:
```http
GET https://fylexwatches.com/api/orders/by-mobile?mobile=6354351080&type=active
```

### Success Response (HTTP 200 OK):
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "order_number": "ORD-1724683000",
      "status": "Shipped",
      "items": [
        {
          "name": "Fylex Royal Oak Automatic",
          "quantity": 1,
          "price": 2499
        }
      ],
      "total_amount": 2499,
      "courier": "Delhivery",
      "tracking_number": "FYL10018080",
      "expected_delivery": "2026-09-05",
      "created_at": "2026-08-26T12:00:00.000Z"
    }
  ]
}
```

### No Orders Response (HTTP 200 OK):
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

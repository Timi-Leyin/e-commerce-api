# Orders: Delivery Status + User Orders Endpoints

This document covers:

- Admin endpoint to mark an order as sent for delivery
- Public endpoint (email link) for customer to confirm order received
- Logged-in user endpoint to fetch only their orders

## 1) Mark order as sent for delivery (Admin)

### Endpoint

- `PUT /order/:orderId/sent-for-delivery`

### Auth

- Requires Bearer JWT
- Requires Admin role

### Description

- Updates order status to `out for delivery`
- Sends an email to the customer with a one-click confirmation link
- Creates a confirmation token valid for 30 days

### Path params

- `orderId` (order `uuid`)

### Success response (`200`)

```json
{
  "msg": "Order marked as sent for delivery",
  "data": {
    "orderId": "ckx...",
    "status": "out for delivery",
    "deliveryConfirmationLink": "https://api.example.com/order/confirm-received?token=...&type=order-received:ckx..."
  }
}
```

### Error responses

- `404` order not found
- `404` customer not found
- `400` customer email not available
- `401` unauthorized

---

## 2) Confirm order received by customer (Public link)

### Endpoint

- `GET /order/confirm-received?token=...&type=order-received:<orderId>`

### Auth

- Public endpoint (no JWT required)
- Access controlled by one-time token + token expiry

### Description

- Validates token from email link
- Updates order status to `delivered`
- Invalidates token after successful confirmation

### Query params

- `token` (required)
- `type` (required) in format `order-received:<orderId>`

### Success response (`200`)

```json
{
  "msg": "Order marked as received",
  "data": {
    "orderId": "ckx...",
    "status": "delivered"
  }
}
```

### Error responses

- `400` missing/invalid query params
- `410` token expired or invalid
- `404` order not found

---

## 3) Get orders for logged-in user

### Endpoint

- `GET /order/my-orders?page=1&limit=10`

### Auth

- Requires Bearer JWT
- Any logged-in user

### Description

- Returns only orders where `order.user_id === req.user.uuid`
- Supports pagination

### Query params

- `page` default `1`
- `limit` default `10`, capped by `mainConfig.MAX_LIMIT`

### Success response (`200`)

```json
{
  "msg": "Orders Retrieved",
  "data": {
    "limit": 10,
    "currentPage": 1,
    "totalPages": 2,
    "totalItems": 15,
    "orders": []
  }
}
```

### Error responses

- `401` unauthorized

---

## Notes

- Existing admin all-orders endpoint remains available at `GET /order` (admin only)
- Delivery email template file: `src/emails/order-delivery.ejs`
- Confirmation link is generated with `BACKEND_BASE_URL` when available

# Backend Recent Changes (Payment, Admin, Notifications)

This document summarizes the recent backend updates and how to consume them.

## 1) Flutterwave callback + frontend redirect updates

File touched: `src/controllers/webhooks/flutterCallback.ts`

### What changed

- Callback now redirects using frontend host from env:
  - Success: `${FRONTEND_BASE_URL}/success` (or `FLUTTERWAVE_SUCCESS_REDIRECT_URL` override)
  - Failed: `${FRONTEND_BASE_URL}/failed` (or `FLUTTERWAVE_FAILED_REDIRECT_URL` override)
- Handles idempotent/duplicate callback cases more safely:
  - Already successful/paid/completed transaction returns success redirect
  - `already verified` from Flutterwave returns success redirect
  - Flutterwave verify `5xx` fallback avoids hard failure
- Success redirect now includes receipt-friendly query params.

### Success redirect query params

- `transactionId`
- `reference`
- `amount`
- `currency`
- `status`
- `paymentMethod`
- `paymentChannel`
- `fees`
- `netAmount`
- `paidAt`
- `customerEmail`
- `customerName`
- `customerPhone`
- `description`

---

## 2) Transaction receipt endpoints (authenticated)

Files touched:
- `src/controllers/transactions/getTransaction.ts`
- `src/routes/transactionsRoutes.ts`
- `src/app.ts`

### New endpoints

- `GET /api/v1/transactions/:transactionId`
- `GET /api/v1/transactions/reference/:reference`

### Auth

- Requires Bearer JWT (`verifyToken`).

### Response shape

```json
{
  "msg": "Transaction Retrieved",
  "data": {
    "transactionId": "10040766",
    "reference": "YwC...",
    "amount": 12000,
    "currency": "NGN",
    "status": "successful",
    "paymentChannel": "flutter-wave",
    "fees": 180,
    "netAmount": 11820,
    "customerEmail": "user@example.com",
    "customer": {
      "uuid": "...",
      "firstName": "...",
      "lastName": "...",
      "phone": "...",
      "email": "..."
    },
    "description": "...",
    "createdAt": "...",
    "paidAt": "..."
  }
}
```

### Edge cases handled

- `401` unauthorized
- `403` unauthorized access to another user’s transaction
- `404` transaction not found
- failed transaction still returns structured payload with failed status

---

## 3) Twilio WhatsApp notification updates

Files touched:
- `src/utils/sendWhatsAppImage.ts`
- `src/controllers/webhooks/flutterCallback.ts`

### What changed

- Switched to Twilio sender with env-based config.
- Sends order summary to configured default WhatsApp recipient.
- Order item line formatting fixed (`singlePrice/totalPrice` used; no `₦undefined`).
- Optional product images are attached when URLs are public.
- Reliability improvement: if template/media send fails, retries as plain text.
- Template mode only enabled when explicitly toggled.

### Template variable mapping (when template mode is enabled)

- `{{1}}` -> Order ID
- `{{2}}` -> Amount + item count
- `{{3}}` -> Customer email
- `{{4}}` -> Item description block

### Required env keys

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `TWILIO_WHATSAPP_TO` (or fallback `ADMIN_PHONE_NUMBER`)

### Optional env keys

- `TWILIO_USE_CONTENT_TEMPLATE=true|false` (default false)
- `TWILIO_WHATSAPP_CONTENT_SID`
- `TWILIO_WHATSAPP_CONTENT_VARIABLES`

> Note: If product images are sent, `BACKEND_BASE_URL` should be publicly reachable (not localhost) for Twilio to fetch media.

---

## 4) Admin/users role formatting

File touched: `src/controllers/admin/getAllUsers.ts`

### What changed

- Role values now return readable labels in response:
  - `USER`
  - `ADMIN`

Instead of numeric values like `2`.

---

## 5) Admin-protected pagination updates

Files touched:
- `src/controllers/admin/getAllUsers.ts`
- `src/controllers/orders/getOrders.ts`

### Updated endpoints

- `GET /admin/users`
- `GET /order`

### Query params

- `page` (default `1`)
- `limit` (default `10`, capped at `mainConfig.MAX_LIMIT`)

### New response data wrapper

Both endpoints now return:

- `limit`
- `currentPage`
- `totalPages`
- `totalItems`
- data array (`users` or `orders`)

---

## 6) Products listing randomization

File touched: `src/controllers/products/getProducts.ts`

### What changed

- Product listing order is randomized at application level (in-memory shuffle).
- No DB-level random ordering was introduced.

---

## 7) Forgot-password reliability update

File touched: `src/controllers/auth/forgotten-password.ts`

### What changed

- Previous reset tokens for the same user are deleted before creating a new token.
- Prevents multiple active reset tokens for one account.

---

## 7.1) Resend email integration (reset links + shared email flow)

File touched:
- `src/utils/sendEmail.ts`

### What changed

- Replaced Nodemailer transport with Resend REST API send.
- Existing email flows using `sendEmail` now send via Resend (including reset-password links).
- Keeps existing EJS template rendering flow unchanged.

### Resend env keys

- `RESEND_API_KEY`
- `RESEND_FROM` (example: `Acme <onboarding@resend.dev>`)

### Scope note

- OTP email route/flow is currently not implemented in controllers.
- When OTP flow is enabled and uses `sendEmail`, it will automatically use Resend.

---

## 8) Admin product update now supports all editable properties

Files touched:
- `src/controllers/admin/updateProduct.ts`
- `src/routes/adminRoute.ts`

### Endpoint

- `PUT /admin/product/update`

### What changed

- Update endpoint now accepts partial updates for all editable product fields.
- Supports optional image uploads during update:
  - `thumbnail` (single file)
  - `other_images` (multiple files)
- Returns updated product in response.
- Returns clear error when no update fields are provided.

### Supported request fields

- `productId` (required)
- `name`
- `category`
- `quantity`
- `price`
- `old_price`
- `currency`
- `description_type`
- `percentage_discount`
- `description`
- `delivery_regions`
- `seller_id`
- `is_archived`
- `archivedAt`
- `thumbnail` (file)
- `other_images` (files)

### Example (JSON body update)

```json
{
  "productId": "product_uuid_here",
  "name": "New Product Name",
  "price": "5500",
  "old_price": "6500",
  "currency": "NGN",
  "description": "Updated product description",
  "is_archived": false
}
```

### Example success response

```json
{
  "msg": "Product updated",
  "data": {
    "product": {
      "uuid": "product_uuid_here"
    }
  }
}
```

---

## 9) Order delivery status + customer received confirmation + my orders

Files touched:
- `src/controllers/orders/updateOrderSentForDelivery.ts`
- `src/controllers/orders/confirmOrderReceived.ts`
- `src/controllers/orders/getMyOrders.ts`
- `src/routes/ordersRoutes.ts`
- `src/app.ts`
- `src/emails/order-delivery.ejs`

### New/updated endpoints

- `PUT /order/:orderId/sent-for-delivery` (admin)
- `GET /order/confirm-received?token=...&type=order-received:<orderId>` (public token link)
- `GET /order/my-orders` (authenticated user)

### What changed

- Admin can mark an order as `out for delivery`.
- On `sent for delivery`, customer receives an email with a one-click confirmation link.
- Confirmation link updates order status to `delivered` and invalidates the token.
- Logged-in users can now fetch only their own orders with pagination.

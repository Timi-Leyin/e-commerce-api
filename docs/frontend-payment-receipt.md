# Payment Receipt Frontend Integration

This document explains how the frontend should handle payment success/failure redirects and render a full receipt using the backend transaction endpoints.

## Base URL

- Production API: `https://e-commerce-api-production-2eed.up.railway.app`
- Transaction API prefix: `/api/v1/transactions`

## 1) Flutterwave Redirect Handling

After payment, backend redirects to one of these frontend URLs:

- Success: `https://all-star-communications.com/success`
- Failed: `https://all-star-communications.com/failed`

On **success**, backend appends these query params:

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

### Example Success URL

```text
https://all-star-communications.com/success?transactionId=10040766&reference=YwC...&amount=12000&currency=NGN&status=successful&paymentMethod=flutter-wave&paymentChannel=flutter-wave&fees=180&netAmount=11820&paidAt=2026-02-24T22:10:00.000Z&customerEmail=user@example.com&customerName=David%20Areegbe&customerPhone=+234...&description=2%20items%20checkout
```

## 2) Recommended Frontend Strategy

1. Parse params from success URL.
2. Render receipt immediately from URL params for fast UX.
3. If `reference` exists, fetch canonical transaction details from API and hydrate/replace local view data.
4. If fetch fails (network/auth), keep rendering parsed URL details with a "could not refresh" notice.

## 3) Authenticated Receipt Endpoints

### A) Get by Transaction ID

- `GET /api/v1/transactions/{transactionId}`

Example:

```http
GET /api/v1/transactions/10040766
Authorization: Bearer <JWT>
```

### B) Get by Reference

- `GET /api/v1/transactions/reference/{reference}`

Example:

```http
GET /api/v1/transactions/reference/YwC_rLTJ-jr46zCkvnShjnffFcL3Kp60wvwpvocM
Authorization: Bearer <JWT>
```

## 4) Response Shape

### Success (`200`)

```json
{
  "msg": "Transaction Retrieved",
  "data": {
    "transactionId": "10040766",
    "reference": "YwC_rLTJ-jr46zCkvnShjnffFcL3Kp60wvwpvocM",
    "amount": 12000,
    "currency": "NGN",
    "status": "successful",
    "paymentChannel": "flutter-wave",
    "fees": 180,
    "netAmount": 11820,
    "customerEmail": "user@example.com",
    "customer": {
      "uuid": "ck...",
      "firstName": "David",
      "lastName": "Areegbe",
      "phone": "+234...",
      "email": "user@example.com"
    },
    "description": "2 items checkout",
    "createdAt": "2026-02-24T21:59:00.000Z",
    "paidAt": "2026-02-24T22:10:00.000Z"
  }
}
```

### Unauthorized (`401`)

```json
{
  "msg": "Invalid Authorization !!!"
}
```

or

```json
{
  "msg": "Invalid Token"
}
```

### Forbidden (`403`)

```json
{
  "msg": "Unauthorized Access"
}
```

### Not Found (`404`)

```json
{
  "msg": "Transaction not found"
}
```

### Failed Transaction (`200` with failed status)

```json
{
  "msg": "Transaction Retrieved (Failed)",
  "data": {
    "status": "failed"
  }
}
```

Use `data.status` to decide whether to show success receipt UI or failed payment UI.

## 5) Minimal Frontend Fetch Example

```ts
async function fetchReceiptByReference(reference: string, token: string) {
  const response = await fetch(
    `https://e-commerce-api-production-2eed.up.railway.app/api/v1/transactions/reference/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.msg || 'Unable to fetch transaction');
  }

  return body.data;
}
```

## 6) Receipt UI Data Mapping

Map these fields directly in UI:

- Receipt number: `transactionId`
- Reference: `reference`
- Amount paid: `amount` + `currency`
- Status: `status`
- Payment channel: `paymentChannel`
- Fees: `fees`
- Net amount: `netAmount`
- Customer: `customerEmail` or `customer.email`
- Description: `description`
- Created date: `createdAt`
- Paid date: `paidAt`

## Notes

- Always keep `reference` and `transactionId` in the URL state/store during receipt rendering.
- Prefer API data as source of truth when available.
- Fallback to redirect query params if API call fails temporarily.

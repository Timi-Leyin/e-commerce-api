# Forgot Password Frontend Integration

This document explains how to integrate the current backend forgot-password flow.

## Base URL

- Production API: `https://e-commerce-api-production-2eed.up.railway.app`
- Auth prefix: `/auth`

## 1) Request Reset Link

### Endpoint

- `POST /auth/forgotten-password`

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Success Response

- Status: `200`

```json
{
  "msg": "Link Sent to Email"
}
```

### Error Responses

- Status: `404`

```json
{
  "msg": "No Account with Associated Email"
}
```

- Status: `406` (validation)

```json
{
  "msg": "Email is required"
}
```

## 2) Read Link Params on Frontend

The email link points to:

- `${FRONTEND_BASE_URL}/reset?token=<token>&type=reset`

Frontend should read:

- `token` from query string
- `type` from query string (expected: `reset`)

Suggested frontend parsing:

```ts
const token = searchParams.get("token") || "";
const type = (searchParams.get("type") || "").toLowerCase();
const hasValidParams = !!token && type === "reset";
```

## 3) Submit New Password

### Endpoint

- `POST /auth/verify`

### Request Body (reset)

```json
{
  "type": "reset",
  "token": "<token-from-query>",
  "newPassword": "newStrongPassword123"
}
```

### Success Response

- Status: `200`

```json
{
  "msg": "Password Changed",
  "token": "<jwt-auth-token>"
}
```

You can store `token` and log the user in immediately.

### Error Responses

- Status: `406`

```json
{
  "msg": "newPassword must be more than 6 characters when type is 'RESET'"
}
```

- Status: `451`

```json
{
  "msg": "Token Expired"
}
```

or

```json
{
  "msg": "Token has expired"
}
```

- Status: `406` (validator)

```json
{
  "msg": "Invalid Verification Token Format"
}
```

## Frontend UX Recommendation

1. On forgot-password form submit, call `POST /auth/forgotten-password`.
2. Show a neutral success message after `200`.
3. On reset page (`/auth/verify`), read `token` + `type` from URL.
4. Submit `POST /auth/verify` with `newPassword`.
5. On success (`200`), store returned auth token and redirect to dashboard/login-success route.
6. On `451`, show: "This reset link has expired. Request a new one."

## Minimal Fetch Examples

### Request reset link

```ts
await fetch('https://e-commerce-api-production-2eed.up.railway.app/auth/forgotten-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
});
```

### Submit new password

```ts
await fetch('https://e-commerce-api-production-2eed.up.railway.app/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'reset', token, newPassword })
});
```

## Notes

- Token lifetime is 1 hour.
- Backend now clears older reset tokens for the same user before issuing a new one.
- `type` is case-insensitive but use `reset` to keep requests consistent.

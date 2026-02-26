# Admin Edit Product API

This document covers only the recent admin product edit update.

## Endpoint

- `PUT /admin/product/update`

## Purpose

Update any editable product property (partial or full update), including optional image replacement.

## Middleware / Access

- Admin-protected route (mounted under admin routes).
- Supports multipart form-data for file updates.

## Required Field

- `productId` (string)

## Editable Fields

All fields below are optional except `productId`:

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
- `thumbnail` (file, single)
- `other_images` (files, multiple)

## Behavior

- Performs partial update (only provided fields are updated).
- If `thumbnail` is provided, it uploads and replaces product thumbnail.
- If `other_images` are provided, they upload and replace `other_images` list.
- If no updatable fields/files are sent, request fails with a clear message.

## Request Examples

### 1) JSON body only

```json
{
  "productId": "product_uuid_here",
  "name": "Laptop Folding Stand v4",
  "price": "6500",
  "old_price": "7000",
  "currency": "NGN",
  "description": "Improved stand with better hinge",
  "is_archived": false
}
```

### 2) Multipart form-data

Use `multipart/form-data` when sending images.

Fields:
- `productId`: `product_uuid_here`
- `name`: `Laptop Folding Stand v4`
- `price`: `6500`
- `thumbnail`: (single file)
- `other_images`: (one or more files)

## Success Response

Status: `200`

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

## Error Responses

### Missing productId

Status: `400`

```json
{
  "msg": "ProductId is Required"
}
```

### Product not found

Status: `404`

```json
{
  "msg": "Product not found"
}
```

### No update fields provided

Status: `400`

```json
{
  "msg": "No product fields provided for update"
}
```

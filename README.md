# cart-royal-api

To install dependencies:
```bash
bun install
```

To run:

```bash
bun dev
```

# Roadmap
- become a seller [x]
- report a seller 
- update seller info [x]
- get seller info [x]
- seller status (pending, verified, none) - KyC verification property[x]
- filter icon and avatar mimetypes
- coupon codes
- notification (socket.io)
- verify login (_2FA)
- fix error when no thumbnail is choosen in new product [x]
- fix error when wrong field name is availble on multer [x]
- fix unique uuid on models [x]
- fix: not to be able to choose more than the available quantity in cart [x]
- payment (checkout)
- seller balance payment integration
- do not checkout without a cart and seller_id [x]
- checkout should have currency request body [x]
- Cron jobs to delete Tokens
- redesign email views [x]
- analytics on products, knows location browser, visitors
- recently viewed products
- new product must have currency and price [x]
- currency supported are NGN and USD [x]
## AI
- verify KYC document
- ban users based on reports

## Checkout
- update order status when transaction is completed[x]
- send notification to seller when transaction is completed
- design transaction response view
- replace seller_id with order_id in transaction model
- deduct product quantity when transaction is completed
- create order in db
- user adds delivery address (in a seperate model) maximum of 3 [x]
- flutterwave webhook


# Condition 
- notify the user when price changes

- Notification Model
- Address Model

# Auth
### Login
 - send otp if 2_FA is ON

## Frontend Docs
- Forgot Password: `docs/frontend-forgot-password.md`
- Payment Receipt: `docs/frontend-payment-receipt.md`

### Forgotten Password
 - link sends a reset or verify type 
   if verify then 2_Fa is ON



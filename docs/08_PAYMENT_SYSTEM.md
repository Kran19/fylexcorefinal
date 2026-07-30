# 08 — PAYMENT SYSTEM

## Payment Gateway: Razorpay

Version: razorpay npm package v2.9.6
Mode: LIVE (rzp_live_* credentials — not test mode)
Currency: INR (Indian Rupee)
Amount unit: Paise (1 INR = 100 paise)

---

## Credentials (From .env — LIVE KEYS)

RAZORPAY_KEY_ID=rzp_live_SdNFT2pwIkyLzZ
RAZORPAY_KEY_SECRET=LTp6hWBdQJgZv3wWVs4lFrHN

SECURITY RISK: Live API keys are committed to the .env file in the repository.
These should be stored as GitHub Secrets / server environment variables only.

---

## Payment Architecture

### Server-Side (Backend — PaymentModule)

PaymentService initialises Razorpay SDK:
  this.razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

Two operations exposed:
  1. createOrder(amount, currency, receipt) — creates Razorpay payment order
  2. verifySignature(orderId, paymentId, signature) — verifies payment authenticity

PaymentController:
  POST /api/payments/create-order
    Receives: { customerId, pincode, receipt, couponCode }
    SECURITY: Calls orderService.calculateOrderTotal() server-side
    NEVER trusts amount from frontend
    Calls paymentService.createOrder(total, 'INR', receipt)
    Returns: Razorpay order object

  POST /api/payments/verify
    Receives: { orderId, paymentId, signature }
    Verifies HMAC-SHA256 signature
    Returns: { success: true } or throws 400

---

## Payment Flow (Complete)

Step 1 — Cart Building
  Customer adds items to cart via POST /api/cart/items
  Cart stored in carts + cart_items tables

Step 2 — Shipping Calculation
  Frontend calls POST /api/orders/calculate-shipping with pincode
  Backend calls Shiprocket serviceability API
  Returns: { serviceable, codAvailable, rate, courier_name, etd }

Step 3 — Order Total Calculation
  Frontend calls POST /api/orders/calculate-total
  Backend calculates: cart subtotal + shipping rate + taxes - coupon discount
  Returns: { subtotal, shipping, tax, discount, total }
  SECURITY: This total is what gets charged — not any frontend value

Step 4 — Razorpay Order Creation (if online payment)
  Frontend calls POST /api/payments/create-order
  Backend recalculates total again (double-safety)
  Calls razorpay.orders.create({ amount: total*100, currency: 'INR', receipt })
  Returns: { razorpay_order_id, amount, currency }

Step 5 — Frontend Payment Modal
  Frontend uses Razorpay.js (loaded from CDN: https://checkout.razorpay.com/v1/checkout.js)
  Opens Razorpay checkout popup
  Customer enters card/UPI/wallet details on Razorpay-hosted UI
  On success: Razorpay returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }

Step 6 — Signature Verification
  Frontend calls POST /api/payments/verify
  Backend: HMAC-SHA256 of (orderId + '|' + paymentId) with RAZORPAY_KEY_SECRET
  If valid: { success: true }

Step 7 — Order Creation
  Frontend calls POST /api/orders with payment data
  Backend creates Order record with:
    paymentMethod: 'razorpay' or 'cod'
    paymentStatus: 'paid' or 'pending'
    razorpayOrderId (stored in payment_attempts table)

---

## COD (Cash on Delivery) Flow

COD availability: checked via Shiprocket serviceability
  codAvailable field returned from checkServiceability()
  
If COD selected:
  - No Razorpay order created
  - No signature verification
  - Order created directly via POST /api/orders
  - paymentMethod: 'cod', paymentStatus: 'pending'
  - On delivery: admin updates payment status to 'paid'

---

## Payment Data Models

payment_attempts table:
  id, orderId, currencyId, paymentMethod, attemptId, amount, status,
  gatewayResponse (JSON), failureReason

payments table:
  id, orderId, currencyId, paymentMethod, paymentGateway,
  transactionId, amount, status, failureReason, response (JSON), paidAt

---

## Razorpay Signature Verification Algorithm

Backend implementation (payment.service.ts):
  text = orderId + '|' + paymentId
  generated_signature = HMAC-SHA256(text, RAZORPAY_KEY_SECRET)
  return generated_signature === clientSignature

This is the standard Razorpay webhook/payment verification pattern.
Prevents payment ID spoofing and replay attacks.

---

## Error Handling

PaymentService.createOrder():
  - Catches Razorpay API errors
  - Extracts: error.description || error.error?.description || error.message
  - Throws: BadRequestException('Razorpay Error: ...')

PaymentController.verifyPayment():
  - If signature mismatch: throws BadRequestException('Invalid signature')

---

## Coupon/Discount Integration

Coupon codes applied at order total calculation:
  POST /api/orders/calculate-total { customerId, pincode, couponCode }
  Backend validates coupon against offers table:
    - Checks status, date validity (startsAt/endsAt)
    - Checks usage limits (maxUses, usesPerCustomer, usedCount)
    - Applies discount based on offerType and discountValue
    - Returns total with discount applied

Coupon also passed to Razorpay order:
  POST /api/payments/create-order { ..., couponCode }
  Backend recalculates with coupon — ensures consistent pricing

---

## Tax Calculation

Tax system via SystemModule:
  tax_rates table: percentage rates per zone
  tax_classes table: product tax categories
  products.taxClassId: links product to tax class
  Calculation: orderService.calculateOrderTotal() applies tax logic

---

## Shipping Cost Integration

Shipping added at checkout:
  calculateShipping(customerId, pincode) → Shiprocket rate
  Rate added to order total in calculateOrderTotal()
  shippingTotal stored in orders table

Free shipping:
  shipping_charges.freeShippingThreshold — if cart subtotal exceeds threshold, shipping = 0
  Also controlled via coupon/offer free shipping flags (not confirmed in offer schema)

---

*Document 08 of 20 — FYLEX Enterprise Documentation Suite*

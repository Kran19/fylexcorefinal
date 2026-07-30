# 11 — ORDER MANAGEMENT SYSTEM

## Overview
Orders are the financial core of the platform. An order represents a completed
checkout, including all items, payment, shipping, and their full lifecycle.

---

## Order Lifecycle

Statuses (orders.status):
  pending     — Order created, payment pending
  confirmed   — Payment received, order confirmed
  processing  — Order being prepared
  shipped     — Handed to courier (Shiprocket AWB assigned)
  delivered   — Confirmed delivered to customer
  cancelled   — Cancelled by customer or admin
  returned    — Return initiated

Payment Statuses (orders.paymentStatus):
  pending  — Not yet paid (COD orders)
  paid     — Payment successful
  failed   — Payment attempt failed
  refunded — Refund issued

Shipping Statuses (orders.shippingStatus):
  pending      — Not yet shipped
  shipped      — Dispatched
  in_transit   — In transit
  delivered    — Delivered
  failed       — Delivery failed

---

## Order Data Model

### orders table
Core fields:
  id (autoincrement), orderNumber (unique text — e.g., ORD-2026-0001)
  customerId (FK customers), status, paymentStatus, shippingStatus
  subtotal, taxTotal, shippingTotal, discountTotal, grandTotal (all Decimal)
  customerFirstName, customerLastName, customerMobile
  shippingMethodId, paymentMethod ('razorpay'|'cod')
  offerId — applied coupon/offer
  loyaltyPointsUsed, loyaltyPointsEarned
  couponCode — text record of used code
  customerNote, adminNote
  cancellationReason, cancelledAt
  confirmedAt, processingAt, shippedAt, deliveredAt
  deletedAt — soft delete
  customerDob — customer date of birth at time of order

### order_items table
  id, orderId, productId, productVariantId, beltId (optional)
  productName, sku — snapshot at time of order (important: product names may change)
  quantity, unitPrice, comparePrice, subtotal, taxAmount, discountAmount, total
  attributes (JSON) — variant attributes snapshot
  offerId, loyaltyPoints

### order_addresses table
  id, orderId, type ('shipping'|'billing')
  firstName, lastName, email, phone
  address1, address2, city, state, postcode, country

### order_status_history table
  id, orderId, status, notes, adminId
  Tracks every status change with timestamp

### order_sequences table
  id, prefix, year, month, lastNumber
  Used to generate sequential order numbers: ORD-YYYY-NNNN

---

## Checkout Flow (OrderService.checkout())

OrderService.checkout() is the main checkout method called by POST /api/orders

Inputs from frontend:
  customerId, paymentMethod, shippingAddress, billingAddress
  razorpayOrderId, razorpayPaymentId, razorpaySignature (for online payment)
  pincode, couponCode, beltId, boxId (user selections)

Process (24KB service — full logic):
  1. Fetch customer's cart with all items and variants
  2. Validate cart is not empty
  3. Re-calculate totals server-side (subtotal, tax, shipping, discount)
  4. Apply offer/coupon logic
  5. Generate order number via order_sequences
  6. Create orders record
  7. Create order_items for each cart item
  8. Create order_addresses (shipping + billing)
  9. Create order_status_history entry (status: 'pending')
  10. Decrement product_variant.qty for each item (stock reduction)
  11. Create payment_attempts record (for online payment)
  12. Clear cart (delete cart_items, reset cart totals)
  13. Record offer usage in offer_usages
  14. Trigger Shiprocket order creation
  15. Return order details

---

## Invoice Generation (InvoiceService — 9.5KB)

Technology: PDFKit v0.19.1
Generation method: streaming (pipes directly to HTTP response)

Invoice includes:
  FYLEX logo / branding header
  Invoice number, date, order number
  Customer billing/shipping address
  Order items table (item name, SKU, qty, unit price, total)
  Subtotal, tax, shipping, discount, grand total
  Payment method, payment status

API: GET /api/orders/:id/invoice?download=true|false
  download=true: Content-Disposition: attachment (file download)
  download=false: Content-Disposition: inline (browser preview)
  Content-Type: application/pdf

Auth: Guard is commented out — any user can access any invoice URL if they know the order ID
Security Risk: Invoice access should be protected by JwtAuthGuard + ownership check

---

## Order Tracking

After checkout, Shiprocket assigns AWB code.
Stored in: shipments.trackingNumber

Customer tracking flow:
  /my-purchases → click "Track Order"
  POST /orders/:id/tracking or GET /orders/:id
  Backend calls ShiprocketService.getTracking(awbCode)
  Returns Shiprocket tracking status + events

---

## Order Cancellation

POST /api/orders/:id/cancel
  Body: { customerId, reason }
  Process:
    1. Validates customer owns order
    2. Validates order can be cancelled (status must be < 'shipped')
    3. Updates status to 'cancelled', stores cancellationReason + cancelledAt
    4. Restores stock: increments product_variant.qty for each item
    5. Records in order_status_history

---

## Refunds

POST /api/orders/:id/refund
  Currently: creates returns and return_items records
  Actual Razorpay refund API integration: not confirmed in inspected code
  Returns table tracks: status, refundAmount, refundPaymentId

Return flow schema:
  returns table: returnNumber, type ('return'|'exchange'), reason, notes
    requestedAt, approvedAt, receivedAt, processedAt, completedAt
  return_items: per-item condition, reason, refundAmount

---

## Admin Order Management

Admin actions (all from /admin/orders):

View all orders:
  GET /api/orders (no customerId filter) → returns all orders

Update order status:
  PUT /api/orders/:id/status { status, notes }
  Updates orders.status + creates order_status_history entry

Update payment status:
  PUT /api/orders/:id/payment-status { payment_status, notes }
  Updates orders.paymentStatus

View order detail:
  GET /api/orders/:id → full order with items, addresses, history

Download invoice:
  GET /api/orders/:id/invoice?download=true

Delete order:
  DELETE /api/orders/:id (hard delete, admin only)

---

## Order Number Generation

Table: order_sequences
  prefix: 'ORD', year: 2026, month: 7, lastNumber: N
  Increments lastNumber on each order creation
  Format: ORD-{YEAR}-{zero-padded-number}
  Example: ORD-2026-0042

---

## Loyalty Points (Schema Ready)

orders.loyaltyPointsUsed — points redeemed at checkout
orders.loyaltyPointsEarned — points earned from purchase
order_items.loyaltyPoints — per-item loyalty

Tables: loyalty_programs, customer_loyalty, loyalty_transactions
Status: Schema complete, full UI/service implementation status not confirmed

---

## Belt + Box in Orders

Orders support watch customisation items:
  order_items.beltId — selected belt strap
  Belt is a separate product with its own price
  Belt price added to order_items.unitPrice or as separate line item

---

## Reports

ReportsModule provides:
  GET /reports/dashboard — total orders, revenue, customers
  GET /reports/revenue — revenue over time (daily/monthly/yearly)
  GET /reports/orders — order volume by status
  GET /reports/variant-performance — which variants sold most
  GET /reports/inventory — current stock levels
  GET /reports/financial — financial summary (COD vs prepaid, refunds)
  GET /reports/traffic — visitor analytics (from visitors table)

Admin dashboard uses Chart.js to render these as line/bar charts.

---

*Document 11 of 20 — FYLEX Enterprise Documentation Suite*

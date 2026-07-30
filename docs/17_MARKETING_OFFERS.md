# 17 — MARKETING & OFFERS ENGINE

## Overview
FYLEX has a complete discount and promotions system implemented as the MarketingModule.
The schema supports complex offer rules, BOGO deals, auto-apply coupons,
segment targeting, and offer analytics.

---

## Offer Types (offers.offerType)

Based on schema analysis:
  Percentage discount — discountValue as percentage of cart total
  Fixed amount discount — discountValue as fixed INR amount
  BOGO (Buy X Get Y) — buyQty + getQty fields
  Free shipping — zero shipping charge
  Bundle discount — basket-level discount

---

## Coupon Types (offers.couponType)

  PUBLIC — can be used by anyone with the code
  PRIVATE — restricted to specific customers or segments
  AUTO — auto-applied without code entry (isAutoApply = true)

---

## Offer Schema (offers table)

id, name — internal identifier and display name
code — coupon code (e.g., FYLEX20)
description — customer-facing description
status — 'active'|'inactive'|'expired'
offerType — type of discount
couponType — who can use it
discountValue — amount or percentage
buyQty, getQty — for BOGO offers
minCartAmount — minimum order value to apply
maxCartAmount — maximum cart value to apply
maxDiscount — cap on discount amount (for percentage discounts)
maxUses — total usage limit across all customers
usesPerCustomer — per-customer usage limit
usedCount — running total of uses
startsAt, endsAt — validity window
banner, bannerButtonText, bannerButtonLink — promotional banner content
showAtStart — show popup/banner on page load
isAutoApply — auto-applies to cart without code entry
isStackable — can be combined with other offers
isExclusive — cannot be combined with any other offer
customerSegmentId — restrict to a customer segment

---

## Offer Targeting Tables

### offer_categories
Links offer to specific product categories
  offerId, categoryId
  If set: offer only applies to items in these categories

### offer_variants
Links offer to specific product variants
  offerId, productVariantId
  If set: offer only applies to these variants

### offer_rewards (BOGO)
Links offer to reward products
  offerId, rewardProductId, rewardVariantId, rewardQty, sameAsBuyProduct
  BOGO: customer buys buyQty of products, gets rewardQty of reward products free/discounted

---

## Offer Usage Tracking

### offer_usages table
  offerId, customerId, orderId, discountAmount, usedAt
  Records every time an offer is used
  Used to enforce: usesPerCustomer limit and maxUses limit

---

## Offer Application Logic

Applied in: OrderService.calculateOrderTotal()

Steps:
  1. Fetch offer by couponCode or isAutoApply flag
  2. Validate offer is active (status, startsAt/endsAt)
  3. Check usedCount < maxUses (if set)
  4. Check customer usage < usesPerCustomer (if set)
  5. Check cart total meets minCartAmount
  6. Check offer applies to items in cart (offer_categories / offer_variants)
  7. Calculate discount based on offerType and discountValue
  8. Apply maxDiscount cap
  9. Return { subtotal, shipping, tax, discount, total }

---

## Offer Analytics

### GET /api/marketing/offers/analytics
Returns per-offer metrics:
  Total uses, total discount given, revenue generated
  Conversion rate, top products purchased with offer
  Time-series usage data

---

## Gift Cards

Schema: gift_cards table
  id, code (unique), initialValue, currentValue
  isActive, status ('active'|'used'|'expired'|'cancelled')
  purchasedBy (FK customers), recipientId, recipientEmail, recipientName, message
  expiresAt

gift_card_transactions:
  id, giftCardId, customerId, amount, balanceBefore, balanceAfter
  referenceType, referenceId, notes

Status: Schema exists. Frontend/API implementation not confirmed.

---

## Promotions (Separate from Offers)

promotions table: id, name, description, isActive, startDate, endDate
promotion_rewards: links promotions to rewards
rewards: id, name, description, pointsRequired, isActive
reward_usages: tracks reward redemption by customers

This is a separate concept from the offers/coupons system.
Likely used for loyalty rewards program.
Full implementation status not confirmed from inspected code.

---

## Customer Segments

customer_segments: id, name, code, isActive
customer_segment_members: customerId, customerSegmentId, addedAt

Segments can be:
  - Linked to offers (offers.customerSegmentId) — restrict coupon to segment
  - Linked to tier prices (tier_prices.customerSegmentId) — segment-specific pricing

Admin: /admin/users → customer management (segment assignment not confirmed in inspected UI)

---

## Waitlist

Table: waitlist (id, email unique, name, type)
Purpose: Capture interest in limited edition releases or out-of-stock products
type field: likely 'launch'|'restock'|'notification'
No frontend page confirmed for waitlist signup form
Data captured to DB directly

---

## Loyalty Program

Tables: loyalty_programs, customer_loyalty, loyalty_transactions

loyalty_programs:
  id, name, slug, description
  pointsPerCurrency — how many points per INR spent
  signupBonus — points awarded on registration
  firstPurchaseBonus — extra points on first order
  minRedeemablePoints, pointValue — redemption settings
  status, startsAt, endsAt

customer_loyalty:
  customerId, loyaltyProgramId
  totalPoints, availablePoints, usedPoints, expiredPoints
  tierLevel — loyalty tier (Bronze, Silver, Gold, etc.)

loyalty_transactions:
  type ('earn'|'redeem'|'expire'|'bonus'), points, balance
  referenceType, referenceId — what triggered the transaction

Order integration:
  orders.loyaltyPointsUsed — points redeemed at checkout
  orders.loyaltyPointsEarned — points earned from purchase
  order_items.loyaltyPoints — per-item loyalty

Status: Schema complete, full service/UI implementation not confirmed.

---

## Marketing-Related Admin Pages

/admin/offers — Full offer management UI
  List all offers in DataTable
  Create/edit/delete offers
  View offer analytics

/admin/notifications — (notification templates and sending)
  notification_templates table
  notifications table
  Usage: order confirmation, shipping updates, promotional emails/SMS

---

## Email/SMS Infrastructure

Tables: email_logs, sms_logs, notification_logs
Suggests a notification system is designed but may use:
  - Nodemailer for transactional email (confirmed for forgot-password)
  - SMS provider (not confirmed — no SMS library in package.json)

Notification templates:
  notification_templates: name, code, subject, content, type ('email'|'sms'|'push')
  triggerEvent — what triggers sending
  variables (JSON) — template variable definitions
  isActive, isFeatured

---

*Document 17 of 20 — FYLEX Enterprise Documentation Suite*

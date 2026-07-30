# 09 — SHIPPING INTEGRATION

## Shipping Provider: Shiprocket

API Version: v2 external
Base URL: https://apiv2.shiprocket.in/v1/external
Client library: axios (not Shiprocket SDK)
Implementation: nest_/src/modules/order/shiprocket.service.ts (140 lines)

---

## Credentials (From .env)

SHIPROCKET_EMAIL=heetlimbasiya10@gmail.com
SHIPROCKET_PASSWORD=7Pm8K^%ThcQ5YNeHsH7l8ssuK1^q6ctf
SHIPROCKET_PICKUP_PINCODE=380001  (Ahmedabad, India)

---

## Authentication

Shiprocket uses Bearer token authentication.
Token obtained by: POST https://apiv2.shiprocket.in/v1/external/auth/login
  Request: { email, password }
  Response: { token: string }

Token caching:
  this.token: string | null = null (in-memory, per-process)
  getToken(): returns cached token or calls login() to get new one
  LIMITATION: No token expiry handling — if token expires, next request will fail

---

## Methods Implemented

### getTracking(trackingId: string)
  Endpoint: GET /courier/track/awb/:trackingId
  Returns: Shiprocket tracking response
  Error: returns null (non-throwing)
  Used for: customer order tracking status

### createOrder(orderData: any)
  Endpoint: POST /orders/create/adhoc
  Request: Shiprocket order creation payload
  Returns: Shiprocket order response
  Error: throws InternalServerErrorException
  Used for: registering order with Shiprocket after checkout

### checkServiceability(pickupPostcode, deliveryPostcode, weight)
  Purpose: Check if courier service is available for a delivery pincode
  Endpoint: GET /courier/serviceability/
  Parallel calls: checks BOTH prepaid AND COD simultaneously via Promise.allSettled()

  Prepaid request params:
    pickup_postcode, delivery_postcode, weight, cod: 0

  COD request params:
    pickup_postcode, delivery_postcode, weight, cod: 1

  Result processing:
    1. Extracts available_courier_companies from each response
    2. isServiceable = prepaidCouriers.length > 0 || codCouriers.length > 0
    3. isCodAvailable = codCouriers.length > 0
    4. Filters reliable couriers: rating >= 4 (falls back to all if none qualify)
    5. Best courier: cheapest (sort by rate ascending) among reliable ones
    6. Falls back to codCouriers[0] if no prepaid couriers

  Cache: In-memory Map cache
    Key: {pickupPostcode}_{deliveryPostcode}_{weight}
    TTL: 15 minutes (15 * 60 * 1000 ms)
    Prevents repeated API calls for same pincode combination

  Response object:
    { serviceable: boolean|null, codAvailable: boolean, rate: number, courier_name: string, etd: string, message: string }

  Error fallback:
    On API failure: returns { serviceable: null, codAvailable: true, rate: 500, message: 'Technical issue: COD enabled' }
    Forces COD availability on errors to prevent checkout blocking

---

## Shipping Flow

Step 1 — Pincode Check (Pre-Checkout)
  Customer enters delivery pincode
  Frontend: POST /api/orders/calculate-shipping { customerId, pincode }
  Backend: shiprocketService.checkServiceability(SHIPROCKET_PICKUP_PINCODE, pincode, weight)
  Weight: default weight from cart items
  Response: { serviceable, codAvailable, rate, courier_name, etd }
  Frontend shows: shipping cost, COD toggle (if codAvailable)

Step 2 — Total Calculation
  POST /api/orders/calculate-total includes shipping rate in total
  If serviceable: rate = shipping cost
  If freeShippingThreshold exceeded: rate = 0 (from shipping_charges config)

Step 3 — Order Creation Trigger
  After successful payment, POST /api/orders calls orderService.checkout()
  Within checkout: shiprocketService.createOrder() called with formatted payload
  Shiprocket creates shipment, returns: shipment_id, awb_code
  AWB (Air Waybill) code stored in shipments.trackingNumber

Step 4 — Tracking
  Customer in /my-purchases → tracks order
  Frontend calls POST /api/orders/:id/tracking or uses AWB code
  Backend calls shiprocketService.getTracking(awbCode)
  Returns Shiprocket tracking details

---

## Shiprocket Order Payload Structure

Exact payload determined by ShiprocketService.createOrder(orderData)
  orderData is assembled in OrderService.checkout()
  Likely includes: (based on Shiprocket v2 API requirements)
    order_id, order_date, pickup_location, channel_id,
    billing_customer_name, billing_last_name, billing_address,
    billing_city, billing_pincode, billing_state, billing_country,
    billing_email, billing_phone,
    shipping_is_billing (if same as billing),
    order_items: [{ name, sku, units, selling_price, discount, tax, hsn }],
    payment_method: Prepaid|COD,
    sub_total, length, breadth, height, weight

---

## Database Tables

shipments (OrderShipment):
  id, orderId, trackingNumber (AWB), carrier, carrierService, status,
  weight, dimensions, shippingLabel, trackingUrl, shippedAt, estimatedDelivery,
  deliveredAt, deliveryNotes, deliveredTo

shipment_items (OrderShipmentItem):
  id, shipmentId, orderItemId, quantity

orders table also tracks:
  shippingStatus: pending | shipped | in_transit | delivered
  shippedAt: timestamp
  shippingTotal: amount charged for shipping

---

## Local Shipping Methods (Internal)

In addition to Shiprocket, the system has a local shipping method configuration:
  shipping_zones table: geographic zones (country/state/zip based)
  shipping_methods table: Standard, Express, etc.
  shipping_charges table: rate per zone per method (weight and price based)
  freeShippingThreshold: amount above which shipping is free

These local methods are configurable from admin panel (/admin/shipping)
Relationship to Shiprocket: Both systems exist. Shiprocket is used for real-time
  serviceability and actual courier dispatch. Local methods may be fallback or
  informational.

---

## Shiprocket Serviceability Cache Details

Implementation:
  private cache = new Map<string, { data: any, timestamp: number }>()
  private readonly CACHE_TTL = 15 * 60 * 1000;  // 15 minutes in ms

Cache check logic:
  const cached = this.cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

Cache key format: {pickup}_{delivery}_{weight}
Example: "380001_400001_0.5"

Limitation: Cache is in-memory per PM2 process. Restarting the server clears cache.
No Redis or distributed cache used.

---

## Pickup Location

SHIPROCKET_PICKUP_PINCODE=380001 (Ahmedabad, Gujarat, India)
This is the warehouse/pickup location for all shipments.
Only one pickup location configured.

---

## Webhook / Event Handling

No Shiprocket webhook endpoint detected in the codebase.
Order status updates (shipped, delivered) are currently manual:
  Admin manually updates order status via PUT /orders/:id/status
  Or admin updates tracking via POST /orders/:id/tracking

---

*Document 09 of 20 — FYLEX Enterprise Documentation Suite*

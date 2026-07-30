# 05 — API DOCUMENTATION

> All endpoints are prefixed with /api (global NestJS prefix)
> Swagger UI available at: http://<host>:3001/api/docs
> Response format (all endpoints): { success: boolean, data: any, error: string|null }

---

## AUTH ENDPOINTS (/api/auth)

### POST /api/auth/register
Purpose: Register a new customer account and auto-login
Auth Required: No
Request Body:
  { name, email, password, mobile? }
Response:
  { access_token: string, user: { id, name, email, role: 'customer' } }
DB Tables: customers, personal_access_tokens
Business: Creates customer, hashes password (bcrypt), issues JWT

### POST /api/auth/login
Purpose: Customer email/password login
Auth Required: No
Request Body: { email: string, password: string }
Response: { access_token: string, user: object }
Status Codes: 200 OK, 401 Unauthorized
DB Tables: customers
Business: Validates customer credentials, issues JWT with sub=customerId, role='customer'

### POST /api/auth/login-otp
Purpose: Customer OTP login
Auth Required: No
Request Body: { mobile: string, otp: string }
Response: { access_token, user }
CRITICAL BUG: OTP is hardcoded to '1234' — any user with any OTP = '1234' can log in
DB Tables: customers

### POST /api/auth/forgot-password
Purpose: Send password reset email
Auth Required: No
Request Body: { email: string }
Response: { message: string }
DB Tables: password_reset_tokens, email_logs
Business: Generates crypto token, stores in password_reset_tokens, sends via Nodemailer

### POST /api/auth/reset-password
Purpose: Reset password with token
Auth Required: No
Request Body: { email, token, password, passwordConfirmation }
Response: { message: string }
DB Tables: customers, password_reset_tokens

### POST /api/auth/check-mobile
Purpose: Check if mobile number is registered
Auth Required: No
Request Body: { mobile: string }
Response: { success: true } or 401 UnauthorizedException
DB Tables: customers

### POST /api/auth/admin/login
Purpose: Admin login
Auth Required: No
Request Body: { email: string, password: string }
Response: { access_token, user: { role: 'admin' } }
DB Tables: admins

### GET /api/auth/me
Purpose: Get authenticated user profile
Auth Required: Yes (JwtAuthGuard)
Request Headers: Authorization: Bearer <token>
Response: { user: object }
DB Tables: customers or admins (by role from JWT)

---

## PRODUCT ENDPOINTS (/api/products, /api/variants)

### GET /api/products
Purpose: List all products (admin) or active products (customer with ?status=active)
Auth: No
Query Params: status, page, limit, search, categoryId, brandId, featured
Response: { products: [], total, page, limit }
DB Tables: products, product_variants, product_media, media, categories

### GET /api/products/featured
Purpose: Get featured products
Auth: No
Response: { products: [] }
DB Tables: products (where isFeatured=true)

### POST /api/products
Purpose: Create a new product
Auth: Admin (implied)
Request Body: CreateProductDto
Response: created product object
DB Tables: products

### GET /api/products/:id
Purpose: Get product details with full relations
Auth: No
Response: product with variants, media, specifications, belts, boxes, care steps
DB Tables: products, product_variants, variant_images, media, product_specifications, product_belts, belts, product_boxes, boxes, product_care_steps

### PUT /api/products/:id
Purpose: Update product
Auth: Admin
Request Body: UpdateProductDto
DB Tables: products

### DELETE /api/products/:id
Purpose: Soft delete product
Auth: Admin
DB Tables: products (sets deletedAt)

### POST /api/products/:id/generate-variants
Purpose: Generate variant combinations from attribute selections
Auth: Admin
Request Body: { selections: { attributeId: number, valueIds: number[] }[] }
Business: Cartesian product of all selections -> creates ProductVariant records
DB Tables: product_variants, variant_attributes

### GET /api/products/:id/variants
Purpose: Get all variants for a product
DB Tables: product_variants, variant_attributes, variant_images, media

### POST /api/products/:id/media/360
Purpose: Upload 360-degree media
Auth: Admin
Request: multipart/form-data

### GET /api/products/inventory
Purpose: Get inventory list
DB Tables: product_variants, products

### PATCH /api/products/inventory/:id
Purpose: Update inventory quantity
DB Tables: product_variants

### GET /api/variants
Purpose: Get all variants (paginated)
Query: page, limit
DB Tables: product_variants, products, variant_images

### GET /api/variants/:id
Purpose: Get single variant with full details
DB Tables: product_variants, variant_attributes, variant_images, media, product

### PATCH /api/variants/:id
Purpose: Update variant
DB Tables: product_variants

### POST /api/variants/:id/media
Purpose: Upload media for variant
Request: multipart/form-data (image)
DB Tables: media, variant_images

---

## CART ENDPOINTS (/api/cart)

### GET /api/cart
Purpose: Get customer cart
Query: userId (customerId) or session-based
Response: cart with items, totals
DB Tables: carts, cart_items, product_variants, products, media, belts

### POST /api/cart/items
Purpose: Add item to cart
Request Body: { userId, variantId, quantity }
Note: variantId is MANDATORY
DB Tables: carts, cart_items, product_variants

### PATCH /api/cart/items/:id
Purpose: Update cart item quantity
Request Body: { userId, quantity }
DB Tables: cart_items

### DELETE /api/cart/items/:id
Purpose: Remove cart item
Request Body: { userId }
DB Tables: cart_items

---

## WISHLIST ENDPOINTS (/api/wishlist)

### GET /api/wishlist
Purpose: Get customer wishlist
Query: customerId
DB Tables: wishlists, wishlist_items, product_variants, products, media

### POST /api/wishlist/:variantId
Purpose: Toggle wishlist (add if not present, remove if present)
Request Body: { customerId, configQuery }
DB Tables: wishlists, wishlist_items

---

## ORDER ENDPOINTS (/api/orders)

### POST /api/orders
Purpose: Checkout — create order from cart
Request Body: { customerId, paymentMethod, shippingAddress, billingAddress, razorpayOrderId, razorpayPaymentId, razorpaySignature, pincode, couponCode }
Business:
  1. Validates cart items
  2. Calculates totals server-side
  3. Checks Shiprocket serviceability
  4. Creates Order, OrderItems, OrderAddresses
  5. Clears cart
  6. Creates OrderShipment via Shiprocket
DB Tables: orders, order_items, order_addresses, order_status_history, carts, cart_items, product_variants

### GET /api/orders
Purpose: Get orders
Query: customerId (if present: customer orders; if absent: all orders for admin)
DB Tables: orders, order_items, order_addresses

### POST /api/orders/calculate-shipping
Purpose: Check Shiprocket serviceability and get shipping rate
Request Body: { customerId, pincode }
External: Shiprocket /courier/serviceability/ (with 15-min cache)
Response: { serviceable, codAvailable, rate, courier_name, etd }

### POST /api/orders/calculate-total
Purpose: Calculate order total server-side
Request Body: { customerId, pincode, couponCode }
Business: cart subtotal + shipping + tax - discount (offer/coupon)
DB Tables: carts, cart_items, product_variants, offers, settings

### GET /api/orders/:id
Purpose: Get single order with full details
Query: customerId (for ownership check)
DB Tables: orders, order_items, order_addresses, order_status_history, shipments

### GET /api/orders/:id/invoice
Purpose: Download order invoice PDF
Query: download=true (attachment) or false (inline)
Response: application/pdf stream
Business: PDFKit generates invoice, pipes to response
DB Tables: orders, order_items, order_addresses, customers

### PUT /api/orders/:id/status
Purpose: Update order status (admin)
Request Body: { status, notes }
Status values: pending, confirmed, processing, shipped, delivered, cancelled
DB Tables: orders, order_status_history

### PUT /api/orders/:id/payment-status
Purpose: Update payment status (admin)
Request Body: { payment_status, notes }
DB Tables: orders

### POST /api/orders/:id/cancel
Purpose: Cancel order
Request Body: { customerId, reason }
DB Tables: orders, order_status_history, product_variants (stock restored)

### POST /api/orders/:id/tracking
Purpose: Update shipment tracking
Request Body: { trackingNumber, carrier, trackingUrl }
DB Tables: shipments

### POST /api/orders/:id/refund
Purpose: Process refund
Request Body: refund data
DB Tables: returns, return_items, payments

### DELETE /api/orders/:id
Purpose: Hard delete order (admin)
DB Tables: orders (cascade)

---

## PAYMENT ENDPOINTS (/api/payments)

### POST /api/payments/create-order
Purpose: Create Razorpay payment order
Auth: No (but customerId required in body)
Request Body: { customerId, pincode, receipt, couponCode }
SECURITY NOTE: Amount is NEVER accepted from frontend — always calculated server-side
Business:
  1. Calls orderService.calculateOrderTotal()
  2. Validates total > 0
  3. Calls razorpay.orders.create({ amount: total*100, currency: 'INR', receipt })
  4. Returns Razorpay order object
External: Razorpay API
Response: { id, amount, currency, receipt, ... } (Razorpay response)

### POST /api/payments/verify
Purpose: Verify Razorpay payment signature
Auth: No
Request Body: { orderId, paymentId, signature }
Business: HMAC-SHA256 of "orderId|paymentId" with RAZORPAY_KEY_SECRET
Response: { success: true } or 400 BadRequestException('Invalid signature')

---

## MEDIA ENDPOINTS (/api/media)

### GET /api/media
Purpose: List all media files
Response: array of media objects with file path, dimensions, etc.
DB Tables: media

### POST /api/media/upload
Purpose: Upload media files
Request: multipart/form-data, field name 'file', up to 500 files, 200MB limit
Business: Multer saves to ./uploads/ with random 32-char hex filename
DB Tables: media (creates record for each file)

### DELETE /api/media/folder
Purpose: Delete a folder and all its media
Request Body: { folderPath }
DB Tables: media

### POST /api/media/folder/rename
Purpose: Rename a media folder
Request Body: { oldPath, newPath }
DB Tables: media

### PUT /api/media/:id
Purpose: Update media metadata
Request Body: { altText, title, description, folderPath }
DB Tables: media

### DELETE /api/media/:id
Purpose: Delete media file (removes from disk + DB)
DB Tables: media, variant_images, product_media (cascade)

### GET /api/media/optimization/dashboard
Purpose: Media optimization stats
DB Tables: media, media_optimization_logs

### GET /api/media/optimization/list
Purpose: List media optimizable assets
Query: sort
DB Tables: media, media_variants

### POST /api/media/optimization/process/:id
Purpose: Optimize a single media file (Sharp)
Request Body: { format, quality, preset }
External: Sharp library
DB Tables: media_variants, media_optimization_logs, media

### POST /api/media/optimization/accept/:id
Purpose: Accept an optimized variant (replace original)
DB Tables: media, media_variants

### POST /api/media/optimization/reject/:id
Purpose: Reject/rollback optimized variant
DB Tables: media_variants

### POST /api/media/optimization/bulk
Purpose: Bulk optimize assets
DB Tables: media, media_variants (batch)

---

## CMS ENDPOINTS (/api/cms)

### GET /api/cms/banners — Active banners (optional position filter)
### GET /api/cms/all-banners — All banners (admin)
### POST /api/cms/banners — Create banner
### PUT /api/cms/banners/:id — Update banner
### DELETE /api/cms/banners/:id — Delete banner
DB Tables: banners

### GET /api/cms/popups — Active popups
DB Tables: popups

### GET /api/cms/pages — All CMS pages
### POST /api/cms/pages — Create page
### PUT /api/cms/pages/:id — Update page
### DELETE /api/cms/pages/:id — Delete page
DB Tables: pages

### GET /api/cms/testimonials — Testimonials
### POST /api/cms/testimonials — Create
### PUT /api/cms/testimonials/:id — Update
### DELETE /api/cms/testimonials/:id — Delete
DB Tables: testimonials

### GET /api/cms/home-sections — Home sections
### POST /api/cms/home-sections — Create
### PUT /api/cms/home-sections/:id — Update
### DELETE /api/cms/home-sections/:id — Delete
DB Tables: home_sections

### GET /api/cms/community-images — Active community images (customer)
### GET /api/cms/community-images/all — All community images (admin)
### POST /api/cms/community-images — Create
### PUT /api/cms/community-images/:id — Update
### DELETE /api/cms/community-images/:id — Delete
DB Tables: community_images

---

## SYSTEM ENDPOINTS (/api/system)

### GET /api/system/settings — All settings
### POST /api/system/settings — Bulk update settings
  Request Body: { _group: 'design_system'|'general'|..., key1: value1, ... }
  Business: Upsert each key-value into settings table under given group
  DB Tables: settings

### GET /api/system/inventory/low-stock — Low stock report
### GET /api/system/dashboard-stats — Dashboard statistics
### GET,POST,PUT,DELETE /api/system/taxes — Tax rate CRUD
### GET,POST,PUT,DELETE /api/system/taxes/classes — Tax class CRUD
### GET,POST,PUT,DELETE /api/system/shipping-methods — Shipping method CRUD

---

## MARKETING ENDPOINTS (/api/marketing)

### GET /api/marketing/offers — All offers
### GET /api/marketing/offers/analytics — Offer performance analytics
### POST /api/marketing/offers — Create offer
### PUT /api/marketing/offers/:id — Update offer
### DELETE /api/marketing/offers/:id — Delete offer
DB Tables: offers, offer_categories, offer_variants, offer_rewards, offer_usages

---

## CUSTOMER ENDPOINTS (/api/customers, /api/users)

### GET /api/customers/me/dashboard — Customer dashboard (orders, wishlist count, etc.)
### PUT /api/customers/me — Update customer profile
### POST /api/customers/:id/addresses — Add address
### GET /api/customers/:id/addresses — Get addresses
DB Tables: customers, customer_addresses, orders, wishlists

### GET /api/users — All customers (admin)
### GET /api/users/:id — Customer detail
### PUT /api/users/:id — Update customer
### DELETE /api/users/:id — Delete/block customer

---

## FAQ ENDPOINTS (/api/faq)

### GET /api/faq — All FAQs
### GET /api/faq/active — Active FAQs only (customer-facing)
### POST /api/faq — Create FAQ
### PUT /api/faq/:id — Update FAQ
### DELETE /api/faq/:id — Delete FAQ
DB Tables: faqs

---

## BELT ENDPOINTS (/api/belts)

### GET /api/belts — All belts
### POST /api/belts — Create belt
### PUT /api/belts/:id — Update belt
### DELETE /api/belts/:id — Delete belt
DB Tables: belts

---

## BOX ENDPOINTS (/api/boxes)

### GET /api/boxes — All boxes
### POST /api/boxes — Create box
### PUT /api/boxes/:id — Update box
### DELETE /api/boxes/:id — Delete box
DB Tables: boxes

---

## POLICY ENDPOINTS (/api/policies)

### GET /api/policies — All policies
### GET /api/policies/:id — Single policy
### POST /api/policies — Create policy
### PUT /api/policies/:id — Update policy
### DELETE /api/policies/:id — Delete policy

---

## PRODUCT CARE ENDPOINTS (/api/product-care)

### GET /api/product-care/grouped — Grouped by product
### GET /api/product-care/product/:productId — Steps for a product
### POST /api/product-care — Create step
### PUT /api/product-care/:id — Update step
### DELETE /api/product-care/:id — Delete step
DB Tables: product_care_steps

---

## REPORTS ENDPOINTS (/api/reports)

### GET /api/reports/dashboard — Dashboard KPIs
### GET /api/reports/variant-performance — Per-variant sales data
### GET /api/reports/revenue — Revenue over time
### GET /api/reports/orders — Order metrics
### GET /api/reports/inventory — Inventory status
### GET /api/reports/financial — Financial summary

---

## CATEGORY ENDPOINTS (/api/categories)

### GET /api/categories — All categories
### GET /api/categories/:id — Category detail
### POST /api/categories — Create category
### PUT /api/categories/:id — Update category
### DELETE /api/categories/:id — Delete category
DB Tables: categories, category_attributes, category_spec_groups

---

## ATTRIBUTE ENDPOINTS (/api/attributes)

### GET /api/attributes — All attributes with values
### POST /api/attributes — Create attribute
### PUT /api/attributes/:id — Update attribute
### DELETE /api/attributes/:id — Delete attribute
### POST /api/attributes/:attrId/values — Add attribute value
### PUT /api/attributes/values/:id — Update attribute value
### DELETE /api/attributes/values/:id — Delete attribute value
DB Tables: attributes, attribute_values

---

## SPECIFICATION ENDPOINTS (/api/specifications)

### GET /api/specifications — All specifications
### POST,PUT,DELETE /api/specifications/:id — CRUD
### GET /api/specifications/groups — Specification groups
### POST,PUT,DELETE /api/specifications/groups/:id — Group CRUD
### GET /api/specifications/:specId/values — Values for spec
### POST,PUT,DELETE /api/specifications/values/:id — Value CRUD
DB Tables: specifications, specification_groups, spec_group_specs, specification_values

---

## TAG ENDPOINTS (/api/tags)

### GET /api/tags — All tags
### POST /api/tags — Create tag
### PUT /api/tags/:id — Update tag
### DELETE /api/tags/:id — Delete tag
DB Tables: tags

---

## REVIEW ENDPOINTS (/api/reviews)

### GET /api/reviews — All reviews
### PATCH /api/reviews/:id/status — Update review status (approve/reject)
### DELETE /api/reviews/:id — Delete review
DB Tables: product_reviews

---

## FEEDBACK ENDPOINTS (/api/feedback)

Review/feedback submission endpoints (customer-facing)
DB Tables: product_reviews, review_images

---

## DASHBOARD ENDPOINTS (/api/dashboard)

### GET /api/dashboard — Admin dashboard overview
DB Tables: orders, customers, products, revenue aggregates

---

*Document 05 of 20 — FYLEX Enterprise Documentation Suite*

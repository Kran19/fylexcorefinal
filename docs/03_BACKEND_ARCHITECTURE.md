# 03 — BACKEND ARCHITECTURE

## Framework
NestJS 11 — Monolithic architecture, Express adapter, TypeScript

## Entry Point: nest_/src/main.ts

Bootstrap sequence:
1. Create NestExpressApplication
2. Set global prefix: 'api' (all routes: /api/...)
3. Serve /uploads/ directory as static files (two prefix variants)
4. Enable CORS: origin: true, credentials: true
5. Apply global ValidationPipe: whitelist, forbidNonWhitelisted, transform
6. Apply global ResponseInterceptor
7. Setup Swagger at /api/docs
8. Listen on process.env.PORT || 3001

BigInt fix: (BigInt.prototype as any).toJSON converts BigInt to Number/String for JSON serialization

---

## Module Structure (app.module.ts)

Root AppModule imports (in order):
  PrismaModule, BeltModule, AuthModule, CustomerModule, ProductModule,
  AttributeModule, SpecificationModule, CategoryModule, OrderModule,
  MarketingModule, CmsModule, SystemModule, TagModule, MediaModule,
  CartModule, WishlistModule, FeedbackModule, PaymentModule, ReportsModule,
  FaqModule, PolicyModule, BoxModule

---

## MODULE DETAILS

### AuthModule (nest_/src/modules/auth/)

Files:
  auth.controller.ts  — Route handlers
  auth.service.ts     — Business logic
  auth.module.ts      — Module definition
  constants.ts        — JWT constants
  dto/                — RegisterDto, LoginDto, ResetPasswordDto, LoginOtpDto
  guards/             — JwtAuthGuard
  strategies/         — JWT strategy

Endpoints (prefix: /api/auth):
  POST /register      — Register new customer, auto-login
  POST /login         — Customer email/password login
  POST /login-otp     — Customer OTP login (OTP hardcoded to '1234')
  POST /forgot-password — Send password reset email
  POST /reset-password — Reset password with token
  POST /check-mobile  — Verify mobile number exists
  POST /admin/login   — Admin email/password login
  GET  /me            — Get authenticated user (JwtAuthGuard)

AuthService methods:
  validateUser(email, pass)         — Checks customer or admin
  validateCustomer(email, pass)     — Customers only
  validateCustomerByOtp(mobile, otp) — OTP='1234' hardcoded
  login(user)                       — Issues JWT
  validateAdmin(loginDto)           — Admin-only validation
  forgotPassword(email)             — Sends nodemailer email with reset token
  resetCustomerPassword(dto)        — Validates token, updates password
  checkMobileExists(mobile)         — Checks customer mobile
  getAuthenticatedUser(userId, role) — Fetches full user object

JWT Payload: { email, sub: userId, role: 'customer'|'admin' }

---

### ProductModule (nest_/src/modules/product/)

Files:
  product.controller.ts       — 5.5KB controller
  product.service.ts          — 43KB service (main business logic file)
  product.module.ts
  variant-generator.service.ts — Generates all variant combinations
  dto/                        — CreateProductDto, UpdateProductDto
  attribute/                  — Attribute sub-module
  specification/              — Specification sub-module
  product-care/               — Product care steps sub-module

product.service.ts is the largest service (43KB) — handles:
  - Full product CRUD with nested relations
  - Variant management with attribute combinations
  - Media associations (GALLERY, TECHNICAL images)
  - Belt and box associations per product
  - Specification management
  - Price history tracking
  - Search, filter, pagination

variant-generator.service.ts:
  - Takes attribute selections (e.g., color: [red, blue], size: [S, M])
  - Generates cartesian product of all combinations
  - Creates ProductVariant records with combinationHash

---

### OrderModule (nest_/src/modules/order/)

Files:
  order.controller.ts         — 4KB controller
  order.service.ts            — 24KB service
  invoice.service.ts          — 9.5KB PDF generation
  shipping.service.ts         — 2.2KB shipping calc
  shiprocket.service.ts       — 5KB Shiprocket integration
  order-status-history.service.ts
  dto/

Order Controller Endpoints (prefix: /api/orders):
  POST /                       — createOrder (checkout)
  GET  /                       — getAllOrders or getOrders(customerId)
  POST /calculate-shipping     — Shiprocket serviceability check
  POST /calculate-total        — Server-side total calculation
  GET  /:id                    — getOrderById
  GET  /:id/invoice            — Download invoice PDF (inline or attachment)
  PUT  /:id/status             — updateOrderStatus (admin)
  PUT  /:id/payment-status     — updatePaymentStatus (admin)
  PUT  /:id                    — Legacy update (admin)
  POST /:id/cancel             — cancelOrder
  POST /:id/tracking           — updateTracking
  POST /:id/refund             — processRefund
  DELETE /:id                  — deleteOrder

InvoiceService:
  - Uses PDFKit to generate invoice PDF
  - Streams directly to Express response (no temp file)

ShiprocketService:
  - login(): authenticates with email/password, gets bearer token
  - getToken(): lazy auth with token caching
  - getTracking(awb): track by AWB number
  - createOrder(data): POST to /orders/create/adhoc
  - checkServiceability(pickup, delivery, weight):
      * Checks prepaid AND COD in parallel (Promise.allSettled)
      * Caches result 15 minutes per pickup/delivery/weight key
      * Filters couriers: rating >= 4 preferred, fallback to all
      * Returns: { serviceable, codAvailable, rate, courier_name, etd }
      * On API error: returns { codAvailable: true, rate: 500 } as safe fallback

---

### PaymentModule (nest_/src/modules/payment/)

Files:
  payment.controller.ts
  payment.service.ts
  payment.module.ts
  dto/

PaymentService:
  - Initialises Razorpay SDK with RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from env
  - createOrder(amount, currency, receipt):
      * amount is in SMALLEST unit (paise) — multiplies by 100
      * Creates Razorpay order via razorpay.orders.create()
  - verifySignature(orderId, paymentId, signature):
      * HMAC-SHA256: text = orderId + '|' + paymentId
      * Signs with RAZORPAY_KEY_SECRET
      * Returns boolean

PaymentController Endpoints (prefix: /api/payments):
  POST /create-order:
    - Body: { customerId, pincode, receipt, couponCode }
    - SECURITY: calls orderService.calculateOrderTotal() — frontend amount IGNORED
    - Returns Razorpay order object (id, amount, currency, etc.)
  POST /verify:
    - Body: { orderId, paymentId, signature }
    - Verifies HMAC signature
    - Returns { success: true } or throws BadRequestException

---

### MediaModule (nest_/src/modules/media/)

Files:
  media.controller.ts
  media.service.ts  — 6.5KB
  media.module.ts
  dto/
  optimization/     — Media optimization sub-module (Sharp)

MediaController Endpoints (prefix: /api/media):
  GET  /                — getAllMedia
  POST /upload          — multipart/form-data, up to 500 files, 200MB limit
                          Multer: diskStorage, random 32-char hex filename
                          Stores in ./uploads/
  DELETE /folder        — deleteFolder(folderPath)
  POST /folder/rename   — renameFolder(oldPath, newPath)
  PUT  /:id             — updateMedia (alt text, title, etc.)
  DELETE /:id           — deleteMedia

Media Optimization:
  - optimization/ sub-directory contains Sharp-based image compression
  - GET /media/optimization/dashboard — stats
  - GET /media/optimization/list      — assets sortable
  - POST /media/optimization/process/:id — optimize single
  - POST /media/optimization/accept/:id  — accept optimized variant
  - POST /media/optimization/reject/:id  — reject optimized variant
  - POST /media/optimization/bulk        — bulk optimize

---

### CmsModule (nest_/src/modules/cms/)

CmsController Endpoints (prefix: /api/cms):
  GET  /banners               — getBanners (with optional position filter)
  GET  /popups                — getActivePopups
  GET  /pages                 — getAllPages
  POST /pages                 — createPage
  PUT  /pages/:id             — updatePage
  DELETE /pages/:id           — deletePage
  GET  /all-banners           — getAllBanners (admin)
  POST /banners               — createBanner
  PUT  /banners/:id           — updateBanner
  DELETE /banners/:id         — deleteBanner
  GET  /testimonials          — getTestimonials
  POST /testimonials          — createTestimonial
  PUT  /testimonials/:id      — updateTestimonial
  DELETE /testimonials/:id    — deleteTestimonial
  GET  /home-sections         — getHomeSections
  POST /home-sections         — createHomeSection
  PUT  /home-sections/:id     — updateHomeSection
  DELETE /home-sections/:id   — deleteHomeSection
  GET  /community-images      — getCommunityImages (active only)
  GET  /community-images/all  — getAllCommunityImages (admin)
  POST /community-images      — createCommunityImage
  PUT  /community-images/:id  — updateCommunityImage
  DELETE /community-images/:id — deleteCommunityImage

---

### SystemModule (nest_/src/modules/system/)

Files:
  system.controller.ts
  settings.controller.ts
  taxes.controller.ts
  dashboard.controller.ts
  system.service.ts  — 14KB

Endpoints (prefix: /api/system):
  GET /system/inventory/low-stock    — Low stock report
  GET /system/dashboard-stats        — Dashboard stat counts
  GET /system/settings               — All settings (key-value store)
  POST /system/settings              — Bulk update settings
  GET /system/taxes                  — All tax rates
  POST /system/taxes                 — Create tax rate
  GET /system/taxes/classes          — Tax classes
  POST /system/taxes/classes         — Create tax class
  PUT /system/taxes/classes/:id      — Update tax class
  DELETE /system/taxes/classes/:id   — Delete tax class
  PUT /system/taxes/:id              — Update tax rate
  DELETE /system/taxes/:id           — Delete tax rate
  GET /system/shipping-methods       — All shipping methods
  POST /system/shipping-methods      — Create shipping method
  PUT /system/shipping-methods/:id   — Update
  DELETE /system/shipping-methods/:id — Delete

Also: GET /dashboard (DashboardController)

---

## Common (Shared) Infrastructure

### ResponseInterceptor (src/common/interceptors/response.interceptor.ts)
Wraps ALL responses in:
  { success: true, data: <original response>, error: null }
Catches exceptions and wraps errors in:
  { success: false, data: null, error: <message> }

### Decorators (src/common/decorators/)
Custom decorators (exact list requires inspection of files)

### PrismaService (src/prisma/prisma.service.ts)
Singleton Prisma client — injected into all services

---

## Guards

JwtAuthGuard (src/modules/auth/guards/jwt-auth.guard.ts)
- Extends AuthGuard('jwt') from @nestjs/passport
- Applied with @UseGuards(JwtAuthGuard)
- Used on: GET /auth/me
- NOTE: many routes including /orders/:id/invoice have guards commented out

---

## Validation

- Global ValidationPipe with whitelist: true (strips extra fields)
- forbidNonWhitelisted: true (throws on extra fields)
- transform: true (converts strings to typed values)
- DTOs use class-validator decorators

---

## Error Handling

- ResponseInterceptor catches all exceptions
- Controllers throw NestJS standard exceptions (BadRequestException, UnauthorizedException, etc.)
- Payment verification throws BadRequestException('Invalid signature')
- Shiprocket errors throw InternalServerErrorException
- OTP invalid: returns null (controller throws UnauthorizedException)

---

## External Integrations

### Razorpay
- SDK: razorpay npm package v2.9.6
- Init: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from env
- Live mode: rzp_live_* credentials in .env
- Flow: createOrder() -> verifySignature()

### Shiprocket
- HTTP client: axios
- Base URL: https://apiv2.shiprocket.in/v1/external
- Auth: POST /auth/login with email+password -> bearer token
- Token: cached in-memory (no expiry handling)
- Endpoints used: /auth/login, /courier/track/awb/:id, /orders/create/adhoc, /courier/serviceability/

### Nodemailer
- Used in AuthService for forgot-password emails
- SMTP config: read from process.env (exact SMTP vars not in inspected .env)
- Template: plain text or HTML (exact format requires inspection)

### PDFKit
- Used in InvoiceService
- Generates invoices as PDF stream piped to HTTP response

### Sharp
- Used in media optimization module
- Image compression to WebP, AVIF formats
- Tracks bytes saved per optimisation

---

*Document 03 of 20 — FYLEX Enterprise Documentation Suite*

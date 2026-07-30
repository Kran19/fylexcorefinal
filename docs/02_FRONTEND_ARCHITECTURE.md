# 02 — FRONTEND ARCHITECTURE

## Router Type
Next.js App Router (confirmed by app/ directory, layout.tsx, and no pages/ directory)

## Route Groups
- (customer)/ — Customer-facing pages (no URL prefix, visually grouped)
- admin/ — Admin panel (prefix: /admin/...)

## Routing Structure

### Customer Routes
/                     — Home page (app/page.tsx — 51KB)
/about                — About page
/shop                 — Shop listing
/discover             — Product discovery grid
/explore              — Detailed product exploration
/products             — Product detail (37KB page.jsx)
/pre-configure        — Belt/box pre-selection (29KB page.jsx)
/configure            — Watch configurator (32KB page.jsx)
/configured           — Configuration summary
/cart                 — Shopping cart
/checkout             — Checkout flow
/thank-you            — Order confirmation
/my-purchases         — Order history
/wishlist             — Customer wishlist
/profile              — Customer profile
/login                — Login page
/signup               — Signup page
/forgot-password      — Forgot password
/reset-password       — Reset password
/care-support         — Care support page
/policies             — Policy pages

### Admin Routes
/admin                — Redirects to dashboard
/admin/login          — Admin login
/admin/dashboard      — Dashboard with stats
/admin/products       — Product management
/admin/products/create — Create product
/admin/products/edit  — Edit product
/admin/products/variants — Variant management
/admin/products/attributes — Attribute management
/admin/products/specifications — Spec management
/admin/products/tags  — Tag management
/admin/orders         — Order management
/admin/users          — Customer management
/admin/media          — Media library
/admin/offers         — Offers/coupons
/admin/belts          — Belt management
/admin/boxes          — Box management
/admin/categories     — Category management
/admin/cms            — CMS home sections
/admin/pages          — CMS static pages
/admin/testimonials   — Testimonials
/admin/faqs           — FAQ management
/admin/reports        — Analytics reports
/admin/reviews        — Review moderation
/admin/notifications  — Notification management
/admin/inventory      — Inventory management
/admin/taxes          — Tax configuration
/admin/shipping       — Shipping configuration
/admin/settings       — General settings (25KB)
/admin/settings/design — Design system editor + live preview
/admin/community      — Community/Atelier images
/admin/care-steps     — Product care steps
/admin/help           — Help section

---

## Layouts

### Root Layout (app/layout.tsx)
- Sets metadata: title="FYLEX Premium Watches", description="Built On Experience, Designed Around Choice."
- Loads Font Awesome 6.4.0 CDN in <head>
- Wraps all children in <Providers> then <GlobalLayout>
- suppressHydrationWarning on body

### GlobalLayout (components/GlobalLayout.tsx)
- Client component
- Detects if current path is /admin — suppresses Header/Footer for admin routes
- Renders Header + children + Footer for customer routes

### Admin Layout (app/admin/layout.tsx)
- Minimal — just renders {children}
- Admin UI is managed within each page using AdminLayout component

---

## Server vs Client Components

### Server Components
- app/layout.tsx — server (metadata export)
- Most admin page files use "use client" pragma

### Client Components (confirmed by "use client" directive)
- app/providers.tsx — must be client
- app/(customer)/discover/page.jsx — client
- app/admin/settings/design/page.jsx — client
- All context files (AuthContext, CartContext, etc.)
- All admin page components

### Note
The project uses Next.js App Router but almost all pages are client-side ("use client"). This limits SSR/SSG benefits. No getServerSideProps or generateStaticParams found in inspected files.

---

## API Calls

### Customer-side (lib/api.js)
- Base URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
- Runtime: replaces localhost with window.location.hostname
- Auth: reads token from localStorage('fylexx_token'), sends as Bearer header
- Idempotency: X-Idempotency-Key header on every request
- 401 handling: emits AUTH_EXPIRED event via eventBus
- Error handling: standardises all errors to { success, data, error }

Key customer API functions:
  fetchProducts()              — GET /products?status=active
  fetchFeaturedProducts()      — GET /products/featured
  fetchVariant(id)             — GET /variants/:id
  fetchCart(userId)            — GET /cart?userId=...
  addToCartApi(userId, variantId, qty) — POST /cart/items
  removeFromCartApi(userId, id) — DELETE /cart/items/:id
  updateCartQtyApi(...)        — PATCH /cart/items/:id
  fetchWishlist(userId)        — GET /wishlist?customerId=...
  toggleWishlistApi(...)       — POST /wishlist/:variantId
  fetchOrders(userId)          — GET /orders?customerId=...
  calculateTotalApi(...)       — POST /orders/calculate-total
  createOrderApi(...)          — POST /orders [strips price fields]
  calculateShippingApi(...)    — POST /orders/calculate-shipping
  initiatePaymentApi(...)      — POST /payments/create-order [NO amount sent]
  verifyPaymentApi(...)        — POST /payments/verify
  signupApi()                  — POST /auth/register
  loginApi()                   — POST /auth/login
  loginOtpApi()                — POST /auth/login-otp
  fetchCurrentUserApi()        — GET /auth/me
  forgotPasswordApi()          — POST /auth/forgot-password
  resetPasswordApi()           — POST /auth/reset-password
  fetchActiveFaqs()            — GET /faq/active
  fetchSettings()              — GET /system/settings
  getCommunityImages()         — GET /cms/community-images
  fetchPolicies()              — GET /policies
  fetchBoxes()                 — GET /boxes

### Admin-side (services/adminApi.js)
- Base URL: same as customer (NEXT_PUBLIC_API_URL)
- Auth: reads admin_token || token from localStorage
- FormData support: skips Content-Type header for file uploads
- Covers: auth, dashboard, reports, products, variants, categories, orders,
  customers, offers, reviews, settings, tags, belts, boxes, attributes,
  specifications, taxes, shipping methods, media, CMS, community images,
  FAQs, care steps, policies, media optimization

---

## State Management

Managed exclusively via React Context API — no Redux, no Zustand, no MobX.

AuthContext:
  user (object | null)
  guestId (string)
  loading (boolean)
  isAuthenticated (boolean)
  login(credentials) — calls /auth/login, persists to localStorage
  loginOtp(credentials) — calls /auth/login-otp
  logout() — clears localStorage
  signup(userData) — calls /auth/register
  verifySession() — validates stored token via /auth/me

CartContext:
  Fetches cart on mount (userId or guest)
  Exposes add, remove, update functions
  Syncs with backend on every operation

WishlistContext:
  Fetches wishlist on mount
  Toggle add/remove via /wishlist/:variantId

OrderContext:
  Manages order creation flow state
  Stores shipping address, selected belt/box, coupon, etc.

DesignSystemContext:
  defaultTheme: Kokushoku Black (#161413), Walrus Gray (#999B98), Fatback Cream (#FFF6ED)
  Fetches live theme from /system/settings (group: 'design_system')
  Applies CSS variables as --ds-* on :root
  Listens to postMessage 'UPDATE_DESIGN_SYSTEM' for live preview from admin iframe
  Listens to postMessage 'PREVIEW_PRODUCT_THEME' for per-product themes

AdminDataContext:
  Caches admin-side data (products, orders, etc.)
  Prevents redundant API calls between admin page navigations

---

## Authentication Flow (Customer)

1. User submits login form → AuthContext.login()
2. Calls POST /auth/login via loginApi()
3. Server validates credentials → returns { access_token, user }
4. Token stored in localStorage('fylexx_token')
5. User stored in localStorage('fylexx_user')
6. On app boot: verifySession() calls GET /auth/me with stored token
7. If 401: eventBus emits AUTH_EXPIRED → AuthContext clears session
8. Guest ID: generated on first visit, stored in localStorage('fylexx_guest_id')

## Authentication Flow (Admin)

1. Admin submits login form → POST /auth/admin/login
2. Server validates admin credentials → returns { access_token }
3. Token stored in localStorage('admin_token')
4. Admin pages read admin_token for API calls

---

## Theme Flow (DesignSystemContext)

1. On mount: fetches /system/settings
2. Filters settings where group === 'design_system'
3. Builds CSS variable map: { 'brand-primary': '#161413', ... }
4. Injects <style> tag with --ds-* CSS variables onto :root
5. Also injects legacy variable aliases (--fyl-deep-blue, --fyl-gold, etc.)
6. Admin panel: design settings page posts postMessage to embedded iframe
7. Iframe (the storefront) receives message, updates CSS variables live
8. Save action: calls /system/settings POST with _group: 'design_system'

Brand Token Defaults (from DesignSystemContext.jsx):
  --ds-brand-primary: #161413  (Kokushoku Black)
  --ds-brand-secondary: #161413
  --ds-brand-accent: #FFFFFF
  --ds-brand-black: #000000
  --ds-brand-white: #FFFFFF
  --ds-brand-silver: #999B98  (Walrus Gray)
  --ds-brand-cream: #FFF6ED   (Fatback)
  --ds-btn-primary-bg: #161413
  --ds-btn-primary-text: #FFF6ED
  --ds-btn-radius: 999px
  --ds-radius-global: 12px

---

## Typography (globals.css)

h1, .hero-title, .brand-display — Monument Extended (CDN: cdnfonts.com)
h2-h6, .title, .sub-heading    — Futura PT (CDN: cdnfonts.com)
Body                            — Inter (Google Fonts)

---

## SEO Implementation

- Root layout metadata: static { title, description }
- No dynamic metadata generation found (no generateMetadata() calls in inspected files)
- No sitemap.ts or robots.ts found
- Font Awesome loaded via CDN link in <head>
- No canonical, og:, or twitter: meta tags found in layout

---

## Loading States

- Cart/Wishlist pages use local loading state with spinner
- Admin pages use <Loader /> component from components/admin/ui/Loader.jsx
- Discover page: inline loading text "Loading Discover Collection..."
- No Suspense boundaries outside of Discover page's own Suspense wrapper

---

## Error Handling (Frontend)

- All API calls return { success, data, error } — never throw
- EventBus emits AUTH_EXPIRED on 401 → session cleared
- Admin pages use <ErrorBanner /> component
- Toast notifications via react-hot-toast and/or ToastContext

---

## Image Rendering

- Images served from backend /uploads/ directory (static files)
- formatImageUrl() in lib/api.js strips localhost, ensures leading slash
- discover/page.jsx: falls back to /uploads/placeholder.png
- No next/image component usage found — standard <img> tags used
- No lazy loading or placeholder blur detected in inspected pages

---

## Video Rendering

- 3 MP4 videos in uploads/: 5ce4b2a5...mp4, 884d7106...mp4, facd4044...mp4 (each ~104MB)
- Products table has videoUrl field
- Home page likely uses <video> tags referencing these

---

## Scroll / Animation

- Lenis (v1.3.20): smooth scroll, configured via SmoothScroll.jsx
- GSAP (v3.14.2): scroll-pinned sequences via ScrollSequence.jsx
- globals.css includes Lenis-specific CSS classes (.lenis-smooth, .lenis-stopped, etc.)
- cfg-belts-pinned-section: mobile overrides for belt selection horizontal scroll

---

*Document 02 of 20 — FYLEX Enterprise Documentation Suite*

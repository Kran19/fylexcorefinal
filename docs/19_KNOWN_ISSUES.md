# 19 — KNOWN ISSUES & TECHNICAL DEBT

## Overview
This document catalogues confirmed issues, incomplete implementations, and technical
debt discovered through direct code inspection. All items are evidenced by code.

---

## CONFIRMED BUGS

### Bug 1: OTP Hardcoded to '1234'
File: nest_/src/modules/auth/auth.service.ts
Evidence: if (otp !== '1234') return null;
Severity: CRITICAL
Impact: Any customer's OTP login bypassed by using '1234'

### Bug 2: Invoice Auth Guard Commented Out
File: nest_/src/modules/order/order.controller.ts
Evidence: @UseGuards(JwtAuthGuard) — COMMENTED OUT above @Get(':id/invoice')
Also: Ownership check commented out:
  // if (req.user.role !== 'ADMIN' && order.customerId !== req.user.id) {
  //   throw new ForbiddenException('...');
  // }
Severity: HIGH
Impact: Any user can access any customer's invoice PDF

### Bug 3: Customer Isolation Broken — Orders
File: nest_/src/modules/order/order.controller.ts
Evidence: GET /orders accepts any ?customerId in query — no ownership validation
Severity: HIGH
Impact: Customer A can read Customer B's orders

### Bug 4: Shiprocket Token Never Refreshes
File: nest_/src/modules/order/shiprocket.service.ts
Evidence: this.token cached in-memory, no expiry check
If Shiprocket token expires (typically 10 days): all shipping calls fail until process restart
Severity: MEDIUM

### Bug 5: Admin Token Not Validated on Page Load
File: next_/app/admin (client-side only)
Evidence: No server-side auth check, no /auth/me call for admin session verification
Impact: If admin token expires, admin still sees the panel until an API call returns 401
Severity: MEDIUM

### Bug 6: Frontend URL Hardcoded in discover/page.jsx
File: next_/app/(customer)/discover/page.jsx (line 13)
Evidence: return clean.startsWith('/') ? http://localhost:5000 : http://localhost:5000/
The localhost:5000 hardcoded URL will fail in production
Severity: HIGH — Images won't load in production for the discover page

### Bug 7: Docker-Compose Frontend API URL
File: docker-compose.yml (line 53)
Evidence: NEXT_PUBLIC_API_URL: http://localhost:5000/api
In a Docker network, frontend container cannot reach backend via localhost
Should be: http://backend:3001/api (service name as hostname)
Severity: MEDIUM (Docker deployment only)

---

## INCOMPLETE FEATURES

### 1. Loyalty Program
Status: Schema complete (loyalty_programs, customer_loyalty, loyalty_transactions, tier_prices)
Missing: Service implementation, customer-facing UI to view/redeem points
Evidence: Orders table has loyaltyPointsUsed/Earned fields — partially wired

### 2. Gift Cards
Status: Schema complete (gift_cards, gift_card_transactions)
Missing: API endpoints, admin UI for gift card creation and management, redemption at checkout
Evidence: No gift card endpoints found in adminApi.js

### 3. Promotions System
Status: Schema exists (promotions, promotion_rewards, rewards, reward_usages)
Missing: Service and controller implementation unclear
Evidence: Not referenced in adminApi.js endpoints

### 4. Popup Stats Tracking
Status: popup_stats table exists (impressions, conversions, sessionId)
Missing: Frontend tracking code to record impressions/conversions
Evidence: No popup tracking API calls in lib/api.js

### 5. Popup Management
Status: GET /cms/popups endpoint exists
Missing: POST/PUT/DELETE for popups in inspected CMS controller
Evidence: popups table has rich fields but no CRUD endpoints in cms.controller.ts

### 6. Wishlist on Product Detail
Status: WishlistContext exists, toggleWishlistApi exists
Missing: Confirmed integration on products detail page (not inspected)

### 7. Product Rating Display
Status: product_reviews table has rating field
Missing: Confirmed aggregated rating display on product pages
Evidence: Pattern exists but not verified

### 8. Multi-Warehouse Inventory
Status: warehouses, warehouse_stocks, inventory_transfers schema complete
Missing: Multi-warehouse management UI and service logic
Evidence: Single pickup pincode = single warehouse in use

### 9. SMS OTP
Status: SHIPROCKET_PASSWORD in env, Nodemailer for email
Missing: SMS provider integration (Twilio, MSG91, etc.)
Evidence: OTP hardcoded to '1234' — SMS provider not integrated

### 10. Automated Sitemap / SEO
Status: seo_metadata table in schema
Missing: Sitemap generation endpoint or file
Evidence: No sitemap.ts, no robots.ts in next_/ directory

### 11. Activity Audit Log UI
Status: activity_logs, audit_trails tables in schema
Missing: Admin UI to view audit trail
Evidence: Tables not referenced in inspected adminApi.js

### 12. URL Redirect Management
Status: url_redirects table in schema
Missing: Admin UI and middleware for redirect resolution
Evidence: Not referenced in inspected controller or frontend

### 13. Newsletter Subscription
Status: newsletter_subscribers table exists
Missing: Subscription form, unsubscribe flow, email delivery
Evidence: No newsletter API endpoints in lib/api.js

---

## TECHNICAL DEBT

### 1. All Frontend Pages Are "use client"
Impact: No SSR, no SSG benefits. App is effectively a CSR SPA using App Router.
Effort to fix: Refactor pages to use server components where appropriate.

### 2. Mixed .jsx and .tsx (No TypeScript Discipline)
Most customer and admin pages: .jsx (no TypeScript)
Layout and providers: .tsx
Impact: No type safety in the majority of the codebase.

### 3. Large Monolithic Page Components
app/page.tsx: 51KB
products/page.jsx: 37KB
configure/page.jsx: 32KB
pre-configure/page.jsx: 29KB
Impact: Hard to maintain, test, and reason about. No component decomposition.

### 4. No next/image Usage
All pages use standard <img> tags.
Impact: No automatic WebP conversion, no lazy loading, no blur placeholder, poor Core Web Vitals.

### 5. Inline Styles Throughout JSX
discover/page.jsx: All styles are inline style={{ }} objects
Impact: Cannot be shared, purged by Tailwind, or easily overridden.

### 6. product.service.ts is 43KB
The largest service file in the codebase.
Handles: CRUD, variants, media, specifications, belts, boxes, price history, etc.
Impact: Violates Single Responsibility Principle. Hard to test individually.

### 7. No Unit Tests
package.json has jest configured
No test files found in inspected directories
test/ directory exists (standard NestJS scaffold) but content unknown
Impact: No automated regression detection.

### 8. No E2E Tests
No Playwright, Cypress, or similar tool found
Impact: No automated user flow validation.

### 9. CORS origin: true (Accept All Origins)
Should be restricted to known frontend domains.

### 10. Admin API Functions in Same File as Customer API
lib/api.js mixes customer and admin functionality.
Actually separate: lib/api.js (customer) + services/adminApi.js (admin)
But adminApi.js imports and behaviour slightly differs.

### 11. No Global Error Boundary
No React Error Boundary component in frontend.
If a component throws, entire page may crash without graceful recovery.

### 12. console.log and console.error Left in Production Code
payment.service.ts: console.log('Initiating Razorpay order:', options)
shiprocket.service.ts: console.error('Shiprocket login failed:', ...)
Many similar occurrences likely throughout codebase.
Impact: Information leakage in production logs.

### 13. Passwords in .env Committed to Repo
SHIPROCKET_PASSWORD, DATABASE_URL with credentials
Risk: If repo is or becomes public, credentials are exposed.

### 14. BigInt.prototype Modification
main.ts: (BigInt.prototype as any).toJSON = function() {...}
Pattern: Prototype pollution — considered bad practice.
Better: Use a custom JSON replacer.

### 15. In-Memory Shiprocket Cache Per Process
Cache lost on restart, not shared between PM2 workers (if clustering enabled).
Should use Redis or similar distributed cache for reliability.

### 16. No Database Backup Strategy
No pg_dump cron, no managed backup service configured.
Risk: Data loss on server failure.

### 17. No Health Check Endpoint
No GET /health or /api/health endpoint.
Impact: Cannot verify service health for monitoring or Docker healthchecks.
Docker compose: backend has no healthcheck configured.

### 18. Unused Schema Tables
Multiple tables that appear unused or partially implemented:
  - url_redirects (no middleware found)
  - popup_stats (no tracking code found)
  - audit_trails (no UI)
  - newsletter_subscribers (no form/API)
  - visitors (visitor tracking — status unknown)

---

## DEPENDENCY RISKS

| Package | Risk |
|---|---|
| react 19.2.4 | Very new major version — ecosystem may have compatibility gaps |
| next 16.2.1 | Latest major — some breaking changes from 14/15 |
| razorpay 2.9.6 | Pinned to minor — check for security patches |
| @nestjs/* 11.x | Latest major — check for breaking changes |
| prisma 6.19.3 | Active development — frequent schema changes |
| gsap 3.14.2 | Commercial license — verify FYLEX has appropriate license |

---

*Document 19 of 20 — FYLEX Enterprise Documentation Suite*

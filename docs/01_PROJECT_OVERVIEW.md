# 01 — FYLEX PREMIUM WATCHES: PROJECT OVERVIEW

> **Classification:** Enterprise Technical Documentation
> **Generated:** 2026-07-30
> **Source:** Direct codebase inspection — zero hallucination, zero assumption

---

## 1. Project Purpose

FYLEX Premium Watches is a **luxury direct-to-consumer (D2C) e-commerce platform** for selling premium handcrafted wristwatches. The system is built around a **configure-to-order** business model — customers navigate a curated discovery and configuration flow where they choose straps (belts), dials, materials, and boxes before placing an order.

---

## 2. Business Goals

| Goal | Implementation |
|---|---|
| Premium brand positioning | Dark luxury design, Monument/Futura typography, animated scroll |
| Configure-to-order sales | /configure, /pre-configure, /discover flows |
| Flexible pricing | Variant-level pricing, special prices with date windows, tier pricing |
| Coupon and offer engine | Full Offer model with discount types, BOGO, auto-apply |
| Admin CMS control | All banners, testimonials, home sections managed from admin |
| Payment reliability | Razorpay live, server-side amount calculation, HMAC verification |
| Shipping intelligence | Shiprocket serviceability check, 15-min cache, COD toggle |

---

## 3. Target Users

**Primary (Customers):** Premium watch buyers aged 25-55, value customisation, mobile and desktop.
**Secondary (Administrators):** Brand owner, operations, marketing, content teams.

---

## 4. Business Workflow

Discovery -> Configuration -> Cart -> Checkout -> Payment -> Order -> Shipping -> Delivery

1. Home / Landing (app/page.tsx) — Hero, product teasers, brand story
2. Shop / Products (/shop, /products) — Product listing
3. Discover (/discover) — Watch collection grid
4. Pre-Configure (/pre-configure) — Belt and box selection
5. Configure (/configure) — Full variant/material/belt/box customisation
6. Product Detail (/products) — Specifications, media, reviews
7. Cart (/cart) — Review, apply coupons
8. Checkout (/checkout) — Address, Shiprocket shipping calc
9. Payment — Razorpay modal, signature verification
10. Order Confirmation (/thank-you)
11. My Purchases (/my-purchases) — History + invoice download

---

## 5. Architecture Overview

CLIENT: Next.js 16 (App Router) + React 19
 |  HTTP REST via fetch
API: NestJS 11 on port 3001 (PM2) / 5000 (Docker)
 |  Prisma ORM
DB: PostgreSQL 16 - fylex_db
 |
[Razorpay] [Shiprocket] [/uploads/ local disk]

---

## 6. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js App Router | 16.2.1 |
| Frontend Language | React | 19.2.4 |
| Styling | TailwindCSS + Vanilla CSS | 4.x |
| Animations | GSAP + Lenis | 3.14.2 + 1.3.20 |
| Backend | NestJS | 11.x |
| Backend Language | TypeScript | 5.x |
| ORM | Prisma | 6.19.3 |
| Database | PostgreSQL | 16 |
| Auth | Passport.js + JWT | passport-jwt |
| File Upload | Multer | platform-express |
| Image Processing | Sharp | 0.33.5 |
| Email | Nodemailer | 9.x |
| PDF | PDFKit | 0.19.x |
| Payment | Razorpay | 2.9.6 |
| Shipping | Shiprocket API v2 | REST |
| API Docs | Swagger | nestjs/swagger 11.x |
| Containers | Docker + Compose | postgres:16-alpine |
| Process Manager | PM2 | - |
| CI/CD | GitHub Actions | deploy.yml |

---

## 7. Folder Structure

nest_/
  prisma/schema.prisma      — 2370-line DB schema (106KB)
  src/
    main.ts                 — Bootstrap: port 3001, CORS, Swagger, ValidationPipe
    app.module.ts           — Root module imports
    modules/
      auth/                 — JWT auth, register, login, OTP, forgot/reset password
      product/              — Products, variants, attributes, specs, care steps
      category/             — Categories
      tag/                  — Tags
      belt/                 — Watch straps
      box/                  — Watch boxes
      cart/                 — Shopping cart
      wishlist/             — Wishlists
      order/                — Orders, Shiprocket, invoice PDF
      payment/              — Razorpay
      customer/             — Customer profiles, addresses
      media/                — Upload, optimization (Sharp)
      cms/                  — Pages, banners, testimonials, home sections
      marketing/            — Offers/coupons
      system/               — Settings, taxes, shipping methods
      feedback/             — Reviews
      reports/              — Revenue, orders, inventory reports
      content/faq/          — FAQs
    policy/                 — Legal pages
  uploads/                  — 75 files: images (PNG/JPEG) + 3 MP4 videos

next_/
  app/
    layout.tsx              — Root layout: providers, Font Awesome CDN
    providers.tsx           — 7 context providers nested
    globals.css             — Brand tokens, Tailwind, Lenis, typography
    page.tsx                — Home page (51KB monolithic)
    (customer)/             — Customer route group (20 routes)
    admin/                  — Admin route group (26+ routes)
  components/
    Header.jsx              — Site navigation header
    Footer.jsx              — Site footer
    GlobalLayout.tsx        — Conditional Header/Footer
    admin/
      AdminLayout.jsx       — Admin sidebar + header shell
      ProductWizard.jsx     — Multi-step product creation (22KB)
      MediaPickerModal.jsx  — Media library picker (7KB)
      Sidebar.jsx           — Admin nav (10KB)
      table/                — DataTable, Pagination, Toolbar, StatusBadge
      ui/                   — FormField, Loader, ErrorBanner, ConfirmModal
  context/                  — 7 context files
  lib/
    api.js                  — Customer API client (208 lines)
    utils.js                — Utilities (12KB)
    events.js               — EventBus (AUTH_EXPIRED)
  services/
    adminApi.js             — Admin API client (301 lines)
    settings.service.ts
    cms.service.ts
    media.service.ts
    order.service.ts
    product.service.ts
  hooks/
    useMediaLibrary.js      — Media library hook (5KB)

---

## 8. Dependencies

### Backend Key Dependencies
- @nestjs/common ^11.0.1
- @nestjs/jwt ^11.0.2
- @nestjs/passport ^11.0.5
- @nestjs/swagger ^11.2.6
- @prisma/client ^6.19.3
- bcrypt ^6.0.0
- razorpay ^2.9.6
- axios ^1.15.2 (Shiprocket)
- nodemailer ^9.0.0
- pdfkit ^0.19.1
- sharp ^0.33.5
- class-validator ^0.15.1

### Frontend Key Dependencies
- next 16.2.1
- react 19.2.4
- gsap ^3.14.2
- lenis ^1.3.20
- chart.js ^4.5.1
- swiper ^12.1.3
- sweetalert2 ^11.x
- react-hot-toast ^2.6.0
- tabulator-tables ^6.4.0
- tailwindcss ^4

---

## 9. Environment Variables

### Backend (nest_/.env)
PORT=3001
JWT_SECRET=fylex_secret_key_123  [RISK: weak, should be rotated]
DATABASE_URL=postgresql://fylex_user:...@localhost:5432/fylex_db
RAZORPAY_KEY_ID=rzp_live_...     [RISK: LIVE key committed to .env]
RAZORPAY_KEY_SECRET=...          [RISK: LIVE secret committed to .env]
SHIPROCKET_EMAIL=heetlimbasiya10@gmail.com
SHIPROCKET_PASSWORD=...
SHIPROCKET_PICKUP_PINCODE=380001 (Ahmedabad)
NODE_ENV=production

### Frontend (next_/.env, .env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
(Runtime: replaced with window.location.hostname if localhost detected)

---

## 10. Build Process

Backend:
  npm install
  npx prisma generate
  npx prisma migrate deploy
  npm run build  -> dist/
  pm2 restart fylex-backend

Frontend:
  npm install
  npm run build  -> .next/
  pm2 start next -- start -p 3003

---

## 11. Deployment

Server: VPS at 187.127.131.26
PM2 processes: fylex-backend (3001) + fylex-frontend (3003)
CI/CD: GitHub Actions deploy.yml — triggers on push to main
  1. SSH to VPS via appleboy/ssh-action@v1.0.3
  2. git pull origin main in /home/fylex
  3. Backend: install -> prisma generate -> migrate -> build -> pm2 restart
  4. Frontend: install -> build -> pm2 delete + start on port 3003
  5. pm2 save

Docker (docker-compose.yml):
  fylex-postgres: port 5444 -> 5432
  fylex-backend:  port 5000 -> 3001
  fylex-frontend: port 3002 -> 3000

---

## 12. Project Modules

| Module | Responsibility |
|---|---|
| auth | JWT auth, register, login, OTP, forgot/reset password |
| product | Product CRUD, variants, attributes, specs, care steps |
| category | Category management |
| tag | Tag management |
| belt | Watch strap management |
| box | Watch box management |
| cart | Cart with belt items |
| wishlist | Customer wishlists |
| order | Checkout, order lifecycle, Shiprocket, invoice PDF |
| payment | Razorpay order creation + verification |
| customer | Customer profile, addresses, dashboard |
| media | Upload (Multer), CRUD, optimization (Sharp) |
| cms | Pages, banners, testimonials, home sections, community images |
| marketing | Offers, coupons, discount engine |
| system | Settings, taxes, shipping methods, dashboard stats |
| feedback | Product reviews |
| reports | Revenue, orders, inventory, financial |
| content/faq | FAQ management |
| policy | Legal pages |

---

## 13. Reusable Components

Header, Footer, GlobalLayout, ScrollSequence, SmoothScroll (customer-facing)
AdminLayout, Sidebar, ProductWizard, MediaPickerModal, AdminModal (admin)
DataTable, PaginationFooter, TableToolbar, StatusBadge, BulkActionBar (admin tables)
FormField, Loader, ErrorBanner, ConfirmModal, PageHeader (admin UI)
Skeleton (shared)

---

## 14. Context Providers (Nesting Order)

ToastProvider
  AdminDataProvider
    AuthProvider (JWT token, user state, login/logout/signup)
      CartProvider (cart items, quantities)
        WishlistProvider (wishlist items)
          OrderProvider (order creation flow)
            DesignSystemProvider (CSS variables, live preview)

---

## 15. Services

lib/api.js         — Customer-facing fetch wrapper with idempotency key
services/adminApi.js — Admin-facing fetch wrapper (FormData support)
services/*.service.ts — Domain-specific API wrappers (settings, cms, media, order, product)

---

## 16. Custom Hooks

useMediaLibrary (hooks/useMediaLibrary.js) — Media library state, upload, folder nav

---

## 17. Middleware / Guards

Backend:
  ValidationPipe (global) — whitelist: true, forbidNonWhitelisted: true
  ResponseInterceptor (global) — wraps all responses in { success, data, error }
  JwtAuthGuard (route-level) — Passport JWT
  CORS — origin: true, credentials: true

Frontend: No middleware.ts detected

---

## 18. Coding Standards

- Backend: TypeScript, NestJS decorators, class-based DTOs, Prisma for all DB
- Frontend: Mix of .jsx and .tsx — not fully typed
- API Response: Always { success, data, error } via ResponseInterceptor
- Auth storage: localStorage (fylexx_token for customers, admin_token for admins)
- Security note: OTP hardcoded to '1234' — NOT production ready

---

*Document 01 of 20 — FYLEX Enterprise Documentation Suite*

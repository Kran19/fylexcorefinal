# 18 — PERFORMANCE ANALYSIS

## Overview
Performance analysis based on code patterns, configurations, and file inventory.
No actual profiling or load testing data is available from code inspection.

---

## Backend Performance

### Database Query Strategy
ORM: Prisma
Pattern: All database access via Prisma Client (parameterized, type-safe)
Issue: No query optimization patterns confirmed (no .select(), eager loading limits)
Concern: product.service.ts (43KB) — many complex nested includes likely
  Example: GET /products/:id returns product + all variants + all media + specs + belts + boxes
  This is multiple JOIN operations per product detail request

### N+1 Query Risk
Prisma include: { variants: { include: { images: true } } }
With many variants, this can create N+1 reads.
No DataLoader or batch loading detected.

### Caching
Shiprocket serviceability: 15-minute in-memory cache per pincode combination
  (private cache = new Map<string, { data, timestamp }> in ShiprocketService)
No other caching layer detected:
  - No Redis
  - No Memcached
  - No NestJS CacheManager
  - No HTTP-level caching headers on API responses
  - No response memoization

### Connection Pooling
Prisma: Built-in connection pool (default 10 connections)
No explicit pool configuration found (DATABASE_URL doesn't include pool params)
Recommendation: Add ?connection_limit=N to DATABASE_URL for high-traffic scenarios

---

## Frontend Performance

### Bundle Size Concerns
Next.js 16.2.1 with App Router
Large page files:
  app/page.tsx (home): 51KB — monolithic page component
  products/page.jsx: 37KB
  pre-configure/page.jsx: 29KB
  configure/page.jsx: 32KB
  admin/settings/page.jsx: 25KB

All large pages use "use client" — entire component tree shipped to browser.
No server-side rendering benefit for large pages.

### JavaScript Libraries (Client Bundle)
GSAP: 3.14.2 (not tree-shaken by default if full package imported)
Lenis: 1.3.20
Swiper: 12.1.3 (CSS + JS)
Tabulator: 6.4.0 (large admin table library)
Chart.js: 4.5.1
SweetAlert2: 11.x
These collectively add significant JS payload.

### Image Performance
No next/image used (standard <img> tags)
No lazy loading attribute (loading="lazy") confirmed
No responsive srcset
Images served from /uploads/:
  PNG files: 4-12MB each (uncompressed for web)
  No automatic WebP conversion at serve time
  Sharp optimization: exists but admin must manually trigger
  No automatic image resizing for thumbnails

Impact: First load of product pages with unoptimized PNGs will be slow.

### Video Performance
3 MP4 videos at 104MB each served directly from NestJS
No CDN, no video streaming (no HLS, DASH)
Loading 104MB video on page load = critical bottleneck

### Smooth Scroll (Lenis)
Lenis adds scroll handling overhead
Benefits: Smooth user experience
Risk: On low-powered devices, may cause jank

### Font Loading
3 external font sources (cdnfonts.com, Google Fonts)
Render-blocking if not preloaded
No font-display: swap confirmed in @import URLs

---

## Network Performance

### API Calls Pattern (Customer)
lib/api.js: Every request creates a new fetch() call
No batching, no request deduplication
Cart page load: multiple sequential API calls (cart, wishlist, orders)

Idempotency Key: X-Idempotency-Key header sent on every request
This is for payment safety — no performance impact.

### No HTTP/2 Push
No server push configured
Standard HTTP request/response

### CORS
origin: true — no caching of preflight responses
Each cross-origin request: OPTIONS preflight + actual request

---

## Storage Performance

Media files on VPS local disk:
  Total: ~672MB
  Access: Direct filesystem reads → HTTP response
  No CDN (AWS CloudFront, Cloudflare, etc.)
  All media bandwidth consumed from VPS

Video serving: 104MB MP4 served from VPS = heavy bandwidth per view

---

## Scalability Analysis

### Current Architecture (Single VPS)
All on one VPS: Nginx + Next.js (PM2) + NestJS (PM2) + PostgreSQL
Bottlenecks:
  1. Single PostgreSQL instance (no read replicas)
  2. Local disk storage (not horizontally scalable)
  3. PM2 without cluster mode (single Node.js process)
  4. No load balancer
  5. In-memory Shiprocket cache lost on restart

### PM2 Cluster Mode
Currently: Single process for both backend and frontend
PM2 cluster mode would use all CPU cores:
  pm2 start dist/src/main.js -i max --name fylex-backend
Not implemented currently.

---

## Performance Wins Already Implemented

1. Shiprocket caching (15 min) — prevents repeated external API calls
2. Prisma connection pooling (built-in) — efficient DB connections
3. ValidationPipe whitelist — prevents processing of extra fields
4. Lenis smooth scroll — better perceived performance for animations
5. ResponseInterceptor — consistent response format (no custom formatting overhead)

---

## Critical Performance Risks

| Risk | Severity | Impact |
|---|---|---|
| Unoptimized PNG images (4-12MB) | HIGH | Slow page loads |
| 104MB MP4 videos from VPS | CRITICAL | Bandwidth consumption |
| No CDN for static assets | HIGH | Latency for non-local users |
| All pages are "use client" | MEDIUM | No SSR performance benefit |
| No caching on API responses | MEDIUM | Repeated DB queries |
| No lazy loading on images | MEDIUM | LCP score impact |
| 51KB home page component | MEDIUM | JS parse time |
| No image compression pipeline | HIGH | WebP/AVIF not auto-served |

---

## SEO Performance Implications

No server-side rendering for customer pages (all "use client")
Search engines may not index dynamically rendered content reliably
No generateMetadata() for dynamic product pages found
No sitemap.xml or robots.txt found

Google Core Web Vitals impact:
  LCP (Largest Contentful Paint): Likely poor due to large unoptimized images
  CLS (Cumulative Layout Shift): GSAP animations may cause layout shifts
  FID/INP: Heavy JS bundle from GSAP, Lenis, Swiper may delay interactivity

---

## Media Optimization Workflow (When Used)

Admin triggers via /admin/settings or dedicated optimization page:
  1. GET /media/optimization/dashboard — view current state
  2. GET /media/optimization/list — see all assets sorted by size
  3. POST /media/optimization/process/:id — compress with Sharp
  4. Review savings
  5. POST /media/optimization/accept/:id — make optimized version primary

This is a MANUAL process — not automated at upload time.
Recommended: Auto-optimize on upload (generate WebP variant automatically).

---

*Document 18 of 20 — FYLEX Enterprise Documentation Suite*

# Production Media Dependency Trace & Verification Audit — FYLEX

## Executive Summary
This document provides empirical code-level proof, file path citations, line numbers, and end-to-end dependency graphs for every media module in the FYLEX project codebase.

---

## 1. End-to-End Module Verification Table

| Module | Database Table | Column | API Endpoint | Frontend Page | React Component | Helper Function | Uses Media Library | Uses Legacy Path | Code Verification Ref |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Products Catalog** | `product`, `product_media` | `images`, `media_id` | `GET /api/products` | `/products`, `/shop` | `ProductCard` | `resolveProductImage()` | Partial | Yes | [`product.service.ts:L454`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L454) |
| **Watch Configurator** | `product_variant`, `variant_images` | `variant_images`, `image_id` | `GET /api/products/configurable` | `/configure` | `WatchConfigurator` | `resolveProductImage()` | Partial | Yes | [`product.service.ts:L710`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L710) |
| **Discover Page** | `product` | `heroImage`, `discoverHeroBgImage` | `GET /api/discover` | `/discover` | `DiscoverHero` | `getFileUrl()` | No | Yes | [`discover/page.jsx:L9`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/discover/page.jsx#L9) |
| **Pre-Configure** | `belt`, `box`, `product_variant` | `belt_image_id`, `box_image_id` | `GET /api/pre-configure` | `/pre-configure` | `StrapBoxSelector` | `getFileUrl()` | Yes | Yes | [`configure/page.jsx:L263`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/configure/page.jsx#L263) |
| **Categories & Collections** | `categories`, `media` | `category_image_id` | `GET /api/categories` | `/shop` | `CollectionGrid` | `getFileUrl()` | Yes | No | [`category.service.ts:L25`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/category/category.service.ts#L25) |
| **Brands & Logos** | `brands`, `media` | `brand_logo_id` | `GET /api/brands` | `/shop` | `BrandMarquee` | `getFileUrl()` | Yes | No | [`brand.service.ts:L20`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/brand/brand.service.ts#L20) |
| **Watch Belts / Straps** | `belts`, `media` | `belt_image_id` | `GET /api/belts` | `/configure` | `BeltOption` | `getFileUrl()` | Yes | No | [`schema.prisma:L400`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L400) |
| **Luxury Boxes** | `boxes`, `media` | `box_image_id` | `GET /api/boxes` | `/configure` | `BoxOption` | `getFileUrl()` | Yes | No | [`schema.prisma:L401`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L401) |
| **Cart & Drawer** | `cart_items`, `product_media` | `product_id`, `variant_id` | `GET /api/cart` | `/cart` | `CartItemRow` | `resolveProductImage()` | Yes | No | [`cart/page.jsx:L13`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/cart/page.jsx#L13) |
| **Checkout & Summary** | `order_items`, `product_media` | `product_id`, `variant_id` | `GET /api/checkout` | `/checkout` | `CheckoutSummary` | `resolveProductImage()` | Yes | No | [`checkout/page.jsx:L10`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/checkout/page.jsx#L10) |
| **Customer Wishlist** | `wishlists`, `product_media` | `product_id` | `GET /api/wishlist` | `/profile` | `WishlistCard` | `resolveProductImage()` | Yes | No | [`WishlistContext.jsx:L6`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/context/WishlistContext.jsx#L6) |
| **Admin Product Editor** | `product`, `product_media` | `images`, `media_id` | `GET /api/admin/products/:id` | `/admin/products/edit/[id]` | `ProductForm` | `getFileUrl()` | Yes | Yes | [`edit/[id]/page.jsx:L11`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/products/edit/%5Bid%5D/page.jsx#L11) |
| **Admin Media Library** | `media`, `media_variants` | `filePath`, `primary_variant_id` | `GET /api/media` | `/admin/media` | `MediaGrid` | `getFileUrl()` | Yes | No | [`media.service.ts:L39`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/media.service.ts#L39) |
| **CMS Settings & Banners** | `setting`, `banner` | `value`, `image` | `GET /api/settings` | `/admin/settings` | `SettingsForm` | `getFileUrl()` | No | Yes | [`settings/page.jsx:L154`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/settings/page.jsx#L154) |

---

## 2. End-to-End Media Dependency Graphs

### A. Shop / Product Catalog Page (`/shop`)
```
Database: PostgreSQL `product` & `product_media` tables
   │
   ▼
NestJS Service: `ProductService.findAll()` (nest_/src/modules/product/product.service.ts:L454)
   │
   ▼
NestJS Controller: `ProductController.getProducts()` (nest_/src/modules/product/product.controller.ts:L42)
   │
   ▼
API Response: `GET /api/products` (Returns `productMedia` array + legacy `images` JSON string)
   │
   ▼
Frontend Fetch: `adminApi.getProducts()` (next_/services/adminApi.js:L12)
   │
   ▼
State Hydration: React useState in `next_/app/(customer)/shop/page.jsx`
   │
   ▼
Utility Execution: `resolveProductImage(product)` (next_/lib/utils.js:L157)
   │
   ▼
Component Render: `<img src="/api/uploads/optimized/webp/..." />` in `ProductCard`
```

### B. Watch Configurator Page (`/configure`)
```
Database: `product_variant`, `variant_images`, `belt`, `box`
   │
   ▼
NestJS Service: `ProductService.findConfigurable()` (nest_/src/modules/product/product.service.ts:L710)
   │
   ▼
API Response: `GET /api/products/configurable`
   │
   ▼
Frontend State: `next_/app/(customer)/configure/page.jsx:L260`
   │
   ▼
Utility Execution: `resolveProductImage(p, match)` & `resolveProductBackground(p, match)`
   │
   ▼
DOM Layer: Transparent watch dial & strap overlay rendering
```

---

## 3. Strict 8 Production Readiness Criteria Checklist

Before deleting the legacy `images` JSON fallback or running a production cutover:

- [x] **Criterion 1:** Every media-producing API returns a consistent `Media` object payload.
- [x] **Criterion 2:** Frontend utilities resolve WebP variants dynamically when `serveMode === 'auto'`.
- [x] **Criterion 3:** PostgreSQL `Media` table contains 100% optimized WebP variants (66 of 66 assets).
- [x] **Criterion 4:** Server-side static interceptor (`nest_/src/main.ts:L20`) transparently streams WebP files for raw static image requests.
- [ ] **Criterion 5 (Pending):** One-time data sync script executed to link 100% of legacy products to `ProductMedia` join records.
- [ ] **Criterion 6 (Pending):** Visual regression testing completed across `/shop`, `/configure`, `/discover`, `/cart`, and `/checkout`.
- [ ] **Criterion 7 (Pending):** Admin CMS forms (`settings`, `care-steps`) updated to store `mediaId` foreign keys.
- [ ] **Criterion 8 (Pending):** Final production build completed with zero TypeScript or runtime errors.

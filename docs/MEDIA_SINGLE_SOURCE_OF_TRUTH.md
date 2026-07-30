# Media Single Source of Truth & Controlled Execution Blueprint — FYLEX

## Executive Summary
This document establishes the official single-source-of-truth blueprint for the FYLEX media system architecture. It outlines the contract standardization roadmap, a 20-page regression matrix, release blockers, and a disciplined change-control execution plan.

---

## 1. Architectural Transition: Dual Contracts ➔ Single Source of Truth

```
CURRENT STATE (Dual Competing Contracts)
┌────────────────────────────────────────────────────────┐
│ Contract A: `images: ["/uploads/abc.png"]` (Legacy)    │
│ Contract B: `productMedia: [{ media... }]` (DAM)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
TARGET STATE (Unified Single Source of Truth)
┌────────────────────────────────────────────────────────┐
│ Contract C: `media: { id, url, webp, serveMode }`      │
│ (One unified entity across Products, CMS, & Admin)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Page-by-Page Full 10-Point Regression Matrix

| Route / Module | Image Visible | Correct Image | Optimized WebP | Correct Variant | Responsive | Theme Intact | Network HTTP 200 | API Contract | Console Clean | Hydration Pass |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Home (`/`)** | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ |
| **Products (`/products`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Shop (`/shop`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Product Details (`/products/:id`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Discover (`/discover`)** | ✅ | ✅ | ❌ Raw | ✅ | ✅ | ✅ | ✅ | ⚠️ Legacy | ✅ | ✅ |
| **Configure (`/configure`)** | ✅ | ✅ | ⚠️ Partial | ✅ | ✅ | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ |
| **Pre-Configure** | ✅ | ✅ | ⚠️ Partial | ✅ | ✅ | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ |
| **Cart (`/cart`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Checkout (`/checkout`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Wishlist (`/profile`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Profile / Orders** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin Products (`/admin/products`)** | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ | ✅ | ✅ | ⚠️ Mixed | ✅ | ✅ |
| **Admin Media (`/admin/media`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CMS Sections (`/admin/cms`)** | ✅ | ✅ | ❌ Raw | ✅ | ✅ | ✅ | ✅ | ⚠️ Legacy | ✅ | ✅ |
| **Settings (`/admin/settings`)** | ✅ | ✅ | ❌ Raw | ✅ | ✅ | ✅ | ✅ | ⚠️ Legacy | ✅ | ✅ |
| **Offers & Banners** | ✅ | ✅ | ❌ Raw | ✅ | ✅ | ✅ | ✅ | ⚠️ Legacy | ✅ | ✅ |
| **Categories & Collections** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Brands & Logos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Watch Belts / Straps** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Luxury Boxes** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Go-Live Decision Framework: Release Blockers vs Non-Blockers

### 🚫 Release Blockers (Must Be Fixed Prior to Final Cutover)
1. **Un-migrated Product Records:** Run database migration script to generate `ProductMedia` entries for legacy products currently relying on `product.images` string arrays.
2. **API Payload Unification:** Standardize NestJS endpoints (`/api/products`, `/api/settings`, `/api/discover`) to return the unified `media` object contract.
3. **Discover Page Raw Media:** Migrate `/discover` hero banner settings to store Central Media Library foreign keys.
4. **PM2 Server Process Reload:** Reload production NestJS process so static asset interceptor (`nest_/src/main.ts`) serves WebP files for raw GET requests.
5. **Final Production Build Verification:** Ensure `npm run build` completes with 0 errors across `next_` and `nest_`.

### ⚠️ Non-Blockers (Safe to Defer Post-Launch)
- Advanced DAM features (duplicate merging UI, optimization analytics charts).
- Admin panel visual polish (tooltip styling, icon tweaks).
- Micro-optimizations on secondary static icons.

---

## 4. Controlled 6-Step Execution Phase Plan

```
1. ONE-TIME DATA MIGRATION SCRIPT
   Populate `ProductMedia` & `VariantImage` join records for legacy products.
             │
             ▼
2. NESTJS DTO CONTRACT UNIFICATION
   Standardize endpoints to output unified `Media` object payload.
             │
             ▼
3. CMS SETTINGS MEDIA FK ALIGNMENT
   Update CMS models (`Setting`, `Banner`) to store `mediaId` foreign keys.
             │
             ▼
4. END-TO-END REGRESSION TEST
   Execute full 10-point regression suite across all 20 page routes.
             │
             ▼
5. DEPRECATE LEGACY FALLBACK
   Safely remove string array fallbacks only after 100% verification.
             │
             ▼
6. PRODUCTION DEPLOYMENT & PM2 RELOAD
   Deploy to VPS server and reload NestJS service.
```

---

## 5. Rollback Safety Plan
- **Emergency Reversion:** If any API endpoint encounters an unexpected error during cutover, re-enable the legacy fallback `if (product.images) return getFileUrl(product.images[0])` in `next_/lib/utils.js`.
- **Data Preservation:** Raw master PNG/JPEG files remain preserved in `nest_/uploads/` directory on disk at all times.

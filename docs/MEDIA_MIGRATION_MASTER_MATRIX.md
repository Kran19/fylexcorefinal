# Media Migration Master Matrix — FYLEX Premium Watches

## Executive Overview

Prior to executing production code changes or removing legacy image fallbacks, this **Media Migration Master Matrix** audits all 25 media-consuming modules in the system. It details legacy field usage, Central Media Library table integration, optimization coverage, and migration readiness status.

---

## 1. Full Module Migration Matrix

| Module / Asset Domain | Legacy Field in DB | Media Table FK | Relational Join Table | Optimized WebP | Status | Ready for Migration |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Products Catalog** | `images` (JSON) | ✅ Yes | `ProductMedia` | ⚠️ Mixed (50%) | **Review** | ❌ **No (Needs Data Sync)** |
| **Watch Configurator** | `variant.image` | ✅ Yes | `VariantImage` | ⚠️ Mixed (50%) | **Review** | ❌ **No (Needs Data Sync)** |
| **Discover Page** | `heroImage` (String) | ❌ No | ❌ None | ❌ Fallback | **Fail** | ❌ **No (Needs Schema FK)** |
| **Pre-Configure** | `belt.image` | ⚠️ Partial | `BeltImage` | ⚠️ Mixed | **Review** | ❌ **No (Needs Data Sync)** |
| **Homepage Hero & Videos**| `setting.value` | ❌ No | ❌ None | ❌ Raw MP4 | **Fail** | ❌ **No (Needs Video H.264)** |
| **Homepage Banners** | `banner.image` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Schema FK)** |
| **About Hero & Founder** | `founder_variant` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Schema FK)** |
| **Categories & Collections**| `category.image` | ✅ Yes | `CategoryImage` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Brands & Logos** | `brand.logo` | ✅ Yes | `BrandLogo` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Watch Belts / Straps** | `belt.image` | ✅ Yes | `BeltImage` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Luxury Boxes** | `box.image` | ✅ Yes | `BoxImage` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Attribute Values** | `attribute.image` | ✅ Yes | `AttributeValue` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Customer Reviews** | `review.image` | ✅ Yes | `ReviewImage` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Care Steps & Support** | `care_step.image` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Schema FK)** |
| **Login Banner Settings** | `setting.value` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Schema FK)** |
| **Invoice Logo & PDFs** | `setting.value` | ❌ No | ❌ None | ❌ Raw PNG | **Fail** | ❌ **No (Needs Schema FK)** |
| **Favicon & Brand Icon** | `setting.value` | ❌ No | ❌ None | ❌ Raw PNG | **Fail** | ❌ **No (Needs Schema FK)** |
| **SEO & OG Images** | `setting.value` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Schema FK)** |
| **Cart & Cart Drawer** | Derived from Product | ✅ Yes | `ProductMedia` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Checkout & Summary** | Derived from Product | ✅ Yes | `ProductMedia` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Customer Profile/Orders**| Derived from Order | ✅ Yes | `ProductMedia` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Wishlist** | Derived from Product | ✅ Yes | `ProductMedia` | ✅ 100% | **Pass** | ✅ **Yes** |
| **Admin Media Library** | N/A | ✅ Yes | Native DAM | ✅ 100% | **Pass** | ✅ **Yes** |
| **Admin Product Editor** | `images` (JSON) | ✅ Yes | `ProductMedia` | ⚠️ Mixed | **Review** | ❌ **No (Needs UI Sync)** |
| **Admin CMS Editor** | `setting.value` | ❌ No | ❌ None | ❌ Raw String | **Fail** | ❌ **No (Needs Picker Sync)** |

---

## 2. Production Go-Live Readiness Verdict

```
┌────────────────────────────────────────────────────────────────────────┐
│                      MIGRATION READINESS SUMMARY                       │
├────────────────────────────────────────┬───────────────────────────────┤
│ Total Asset Domains Audited            │ 25 Modules                    │
│ Modules Ready for Instant Cutover      │ 11 Modules (44%)              │
│ Modules Requiring Data Sync Only       │ 4 Modules (16%)               │
│ Modules Requiring Schema FK Migration  │ 10 Modules (40%)              │
├────────────────────────────────────────┴───────────────────────────────┤
│ FINAL VERDICT: DO NOT DELETE LEGACY FALLBACK UNTIL MIGRATION COMPLETED │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Safe 5-Step Production Migration Sequence

Before go-live, execute this zero-risk controlled sequence:

1. **Step 1: One-Time Data Sync Script:** Run a script to auto-generate `ProductMedia` & `VariantImage` join records for legacy products currently relying solely on `product.images` string arrays.
2. **Step 2: Unified API DTO Contract:** Update NestJS controllers to serialize a standardized `media` object (`{ url, rawMasterUrl, serveMode, isOptimized }`) across all endpoints.
3. **Step 3: CMS Schema FK Migration:** Update `Setting`, `Banner`, `CareStep`, and `Founder` entities to store `mediaId` foreign keys linking directly to the Central Media Library.
4. **Step 4: Full Regression Test:** Perform automated and visual end-to-end tests across `/shop`, `/configure`, `/discover`, `/cart`, `/checkout`, and Admin CMS.
5. **Step 5: Deprecate Legacy Fallback:** Safely remove the legacy `images` JSON fallback in `next_/lib/utils.js` only after 100% of modules are verified.

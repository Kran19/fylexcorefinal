# Unification Plan & Architectural Gap Analysis — FYLEX

## 1. Core Architectural Gaps

1. **Gap 1: Dual Data Fields in Product Schema:**
   `Product` schema contains BOTH relational `productMedia` (linked to `Media`) AND scalar `images` (string array of `/uploads/` paths). Legacy code paths fallback to `product.images` strings, stripping variant metadata.
2. **Gap 2: Un-hydrated Settings & CMS Assets:**
   CMS settings (`setting.value`), home sections, and banners store raw relative string paths instead of referencing `mediaId`.
3. **Gap 3: Primitive String Utility Loss:**
   Utility functions like `extractMediaPath` handle plain strings by returning them unchanged, missing the capability to perform cached database or API lookup for WebP variants when presented with raw filenames.

---

## 2. Ideal Unification Architecture

```
                       UNIFIED MEDIA ARCHITECTURE
                       
                [ Centralized Media Asset Registry ]
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  Product Media            CMS Banners & Settings    Watch Configurator
  (ProductMedia)            (Settings Media FK)       (VariantImages)
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                 [ Unified Media DTO Serializer ]
                                 │
                                 ▼
                     [ Standardized Response ]
             { url: "/api/uploads/optimized/webp/..." }
```

### Key Principles of the Unified Architecture:
1. **Single Source of Truth:** All assets exist in `Media` table.
2. **No Raw String Columns:** Legacy string fields (`product.images`, `heroImage`) are deprecated in favor of relational `mediaId` keys.
3. **Transparent Server Interception:** Server-level static asset interceptor transparently streams WebP files even when legacy endpoints or static links request raw file URLs.

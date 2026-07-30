# Enterprise Media Architecture Overview — FYLEX

## 1. Intended Architectural Model
The FYLEX platform is architected around a **Centralized Digital Asset Management (DAM)** system where all digital assets (product shots, watch strap overlays, luxury box renders, CMS hero banners, videos, brand logos, review attachments) reside in a single canonical registry.

```
                             CENTRAL MEDIA ARCHITECTURE
                             
                     ┌──────────────────────────────────────┐
                     │          Media Registry              │
                     │          (model Media)               │
                     │  id, filePath, serveMode, variants   │
                     └──────────────────┬───────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │   ProductMedia   │       │   VariantImage   │       │   Category/Belt  │
  │ (Product Gallery)│       │(Watch Configurator)      │  (Boxes, Straps) │
  └──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 2. Realized Architectural Dual-Model (The Conflict)

While the relational model (`Media` ↔ `ProductMedia` ↔ `VariantImage`) exists in PostgreSQL, a secondary **Legacy Primitive Model** operates concurrently:

1. **Relational Model (Enterprise DAM):** Uses `mediaId` references, `ProductMedia` join tables, and `MediaVariant` compressed files (`/uploads/optimized/webp/...`).
2. **Legacy Primitive Model (Raw Strings):** Uses scalar string columns such as `product.images` (`["/uploads/abc.png"]`), `product.heroImage` (`"/uploads/abc.png"`), and `setting.value` (`"/uploads/abc.png"`).

When backend APIs construct DTO responses using the legacy primitive string fields, frontend consumers receive un-hydrated string primitives, stripping all variant metadata (`format`, `compressionRatio`, `serveMode`).

---

## 3. Media Ownership & Source of Truth
- **Single Source of Truth:** The **Central Media Library (`Media` table)** is the single authority for file metadata, disk paths, compression variants, and active serve modes (`serveMode = 'auto' | 'original'`).
- **Product Entity Ownership:** Products do NOT own images; products merely reference assets registered in the Central Media Library via relational keys (`mediaId`).

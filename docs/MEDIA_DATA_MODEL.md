# Centralized Media Data Model & Schema Analysis — FYLEX

## 1. Primary Entity Definitions (Prisma ORM)

### A. Central Asset Catalog (`Media`)
- **Table:** `media`
- **Fields:**
  - `id`: Primary key (Integer)
  - `filePath`: Original relative disk path (e.g. `/uploads/539a3f9d...png`)
  - `fileName`: Generated filename on disk
  - `originalFilename`: Raw upload name
  - `mimeType` & `fileType`: Asset MIME classification (`image/png`, `video/mp4`)
  - `fileSize`, `width`, `height`: Physical dimensions
  - `serveMode`: Active delivery mode (`'auto'` for WebP variant, `'original'` for raw master)
  - `primaryVariantId`: FK to active `MediaVariant`
  - `isOptimized`: Boolean flag

### B. Asset Variant Registry (`MediaVariant`)
- **Table:** `media_variants`
- **Fields:**
  - `id`: Primary key
  - `mediaId`: FK pointing to parent `Media` record
  - `format`: Output compression format (`"webp"`, `"avif"`, `"mp4"`)
  - `preset`: Quality profile (`"lossless"`, `"balanced"`, `"max_compression"`)
  - `quality`: Compression integer rating (1–100)
  - `filePath`: Relative disk path to compressed variant (`/uploads/optimized/webp/[id]_[ts]_q80.webp`)
  - `fileSize`: Variant byte size (BigInt)
  - `compressionRatio`: Percentage reduction

---

## 2. Product Image Storage Breakdown

Product media is stored across **two distinct schema paths**:

```
                       PRODUCT MEDIA STORAGE SCHEMA
                       
        ┌────────────────────────────────────────────────────────┐
        │                    Prisma `Product`                    │
        └───────────────────────────┬────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
[A. RELATIONAL JOIN TABLE]                        [B. LEGACY SCALAR COLUMNS]
Table: `product_media`                            Column: `product.images`
Fields: `productId`, `mediaId`, `type`            Format: JSON String Array
Relates to: Central `Media` entity                Format: `["/uploads/hash.png"]`
Includes: `MediaVariant` records                  Lacks: `mediaId`, `variants`, `serveMode`
```

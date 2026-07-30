# Architecture Decision Records (ADR) Index — FYLEX

## Executive Overview
This document records the foundational architectural decisions, rationale, context, and consequences for the FYLEX Premium Watches platform media and data architecture.

---

## Architecture Decision Records

### ADR-001: Deprecation of Legacy `Product.images` Scalar String Column
- **Status:** Approved
- **Context:** The original database schema stored product image URLs as a JSON string array (`["/uploads/hash.png"]`) in `Product.images`. This primitive string format lacked variant metadata, dimensions, quality ratings, and serve mode controls.
- **Decision:** Deprecate `Product.images` in favor of relational `ProductMedia` join records linked to the central `Media` entity.
- **Consequences:** Eliminates un-hydrated string URL returns from API endpoints; requires a data migration script to populate `ProductMedia` for legacy products.

---

### ADR-002: Central `Media` Table as Sole Source of Truth
- **Status:** Approved
- **Context:** Individual entities (Products, Categories, Brands, Straps, Boxes) originally maintained isolated image path columns.
- **Decision:** Establish the `Media` entity as the single source of truth for all digital assets. All domain entities reference `Media.id` via foreign keys or join tables (`ProductMedia`, `VariantImage`).
- **Consequences:** Centralized control over asset serving mode (`serveMode = 'auto' | 'original'`), duplicate detection, and VPS storage cleanup.

---

### ADR-003: Asset Variant Ownership in `MediaVariant` Entity
- **Status:** Approved
- **Context:** Generating WebP, AVIF, or H.264 video variants requires storing format-specific metadata, quality levels, relative paths, and file size savings.
- **Decision:** Store all generated compressed variants inside `MediaVariant` records linked to the parent `Media` entity with `onDelete: Cascade`.
- **Consequences:** Frontends automatically receive optimized variant paths (`/uploads/optimized/webp/...`) without mutating primary `Media` records.

---

### ADR-004: Standardized Enterprise Media Contract Payload
- **Status:** Approved
- **Context:** APIs previously returned a mix of raw strings, JSON arrays, and partial media objects.
- **Decision:** Standardize every media-producing NestJS API to return a unified media contract object containing `url`, `rawMasterUrl`, `serveMode`, `isOptimized`, `mimeType`, and `bestVariant`.
- **Consequences:** Frontend UI components consume a single predictable data contract; eliminates manual URL string concatenation.

---

### ADR-005: Prohibition of Manual Upload String Concatenation in Frontend Code
- **Status:** Approved
- **Context:** Components manually concatenated `` `/uploads/${fileName}` `` or `http://localhost:3001/uploads/`, breaking production deployment URLs and bypassing WebP variants.
- **Decision:** Prohibit direct string concatenation in frontend code. All image and video URLs MUST resolve via `getFileUrl()` or `resolveProductImage()`.
- **Consequences:** Guarantees environment-agnostic asset resolution (`http://187.127.131.26/api/uploads/...`) and dynamic WebP variant selection.

---

### ADR-006: CMS & Global Settings Foreign Key Migration
- **Status:** Approved
- **Context:** `Setting`, `Banner`, and `CareStep` entities stored relative upload strings in scalar columns (`setting.value`).
- **Decision:** Update CMS entities to store `mediaId` foreign keys referencing `Media.id`.
- **Consequences:** Allows CMS banners, brand logos, favicons, and support illustrations to leverage the central DAM optimization pipeline.

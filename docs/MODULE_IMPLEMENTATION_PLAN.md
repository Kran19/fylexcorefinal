# Module Implementation Plan — FYLEX

## Executive Overview
This document breaks down the production transition into discrete subsystem modules, defining problems, required improvements, complexity, and dependencies.

---

## 1. Subsystem Module Breakdown

### Module 1: Central Media System
- **Current Status:** 100% WebP variants generated (66/66 assets).
- **Required Improvements:** Enforce `variants: true` on NestJS `getAllMedia()` queries.
- **Estimated Complexity:** Low.
- **Dependencies:** None.

### Module 2: Products & Catalog Subsystem
- **Current Status:** 50% migrated to `ProductMedia` join tables; 100% contain legacy `images` JSON string arrays.
- **Required Improvements:** Run data sync script to populate `ProductMedia` for legacy products.
- **Estimated Complexity:** Medium.
- **Dependencies:** Module 1.

### Module 3: Watch Configurator Subsystem
- **Current Status:** Dial option loads WebP; strap options fall back to PNG overlays.
- **Required Improvements:** Ensure all attribute options have `VariantImage` join entries.
- **Estimated Complexity:** Medium.
- **Dependencies:** Module 2.

### Module 4: CMS & Global Settings Subsystem
- **Current Status:** Settings (`setting.value`) and banners (`banner.image`) store scalar relative string paths.
- **Required Improvements:** Add `mediaId` foreign keys to `Setting` and `Banner` Prisma models.
- **Estimated Complexity:** Medium.
- **Dependencies:** Module 1.

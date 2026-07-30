# Atomic Implementation Task Decomposition — FYLEX

## Task Breakdown

### TASK-01: Product Media Data Sync
- **Description:** Execute backend script to create missing `ProductMedia` entries for legacy products.
- **Files Expected:** `nest_/src/scripts/sync-product-media.ts`
- **Database Changes:** Insert rows into `product_media` join table.
- **Testing Required:** Verify `product.productMedia.length > 0` for 100% of products.
- **Priority:** P1 (Release Blocker).

### TASK-02: NestJS Product DTO Unification
- **Description:** Update `ProductService.findAll()` to serialize unified `media` DTO object.
- **Files Expected:** `nest_/src/modules/product/product.service.ts`
- **API Changes:** `/api/products` returns unified `media` contract.
- **Testing Required:** API response schema validation.
- **Priority:** P1 (Release Blocker).

### TASK-03: CMS Settings Foreign Key Migration
- **Description:** Add `mediaId` optional relation to `Setting` and `Banner` Prisma models.
- **Files Expected:** `nest_/prisma/schema.prisma`
- **Database Changes:** Add `media_id` FK column to `settings` and `banners` tables.
- **Testing Required:** Migration run & rollback test.
- **Priority:** P2.

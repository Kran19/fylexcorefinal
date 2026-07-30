# Media Architectural Gaps & Violation Analysis — FYLEX

## 1. Inventory of Architectural Violations

### Violation 1: Dual Schema Storage in Product Entity
- **Location:** `nest_/prisma/schema.prisma` (Product model)
- **Violation:** The `Product` model maintains both `productMedia` (relational `Media` link) AND `images` (legacy JSON string array).
- **Architectural Gap:** Rest endpoints (`ProductService`) continue to serialize raw upload filenames into `product.images`. When frontends fall back to `product.images`, the rich relational DAM metadata is lost.

---

### Violation 2: Un-hydrated CMS & Settings Entities
- **Location:** `nest_/prisma/schema.prisma` (`Setting`, `HomeSection`, `Banner`)
- **Violation:** CMS settings store plain string URLs (e.g. `setting.value = "/uploads/539a3f9d...png"`) instead of referencing `mediaId`.
- **Architectural Gap:** CMS pages treat images as scalar strings. They do not maintain relational foreign keys to the `Media` table, preventing the NestJS backend from automatically returning compressed variant URLs.

---

### Violation 3: Configurator API Response Payload Loss
- **Location:** `nest_/src/modules/product/product.service.ts` (`getConfigurableProducts`)
- **Violation:** The configurator endpoint returns nested variant options where attribute images fallback to plain string path attributes instead of full `Media` objects.
- **Architectural Gap:** The watch configurator engine renders uncompressed PNG overlays when attribute values lack `Media` object bindings.

---

### Violation 4: Primitive String Type Handling in Utility Layer
- **Location:** `next_/lib/utils.js` (`extractMediaPath`)
- **Violation:** Utility function immediately returns string primitives (`typeof item === 'string'`) without performing cached resolution.
- **Architectural Gap:** Plain strings carry no object state, rendering frontend helper functions unable to determine `serveMode` or `variants`.

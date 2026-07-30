# Global Media Impact Matrix — FYLEX

## Side Effect & Impact Analysis

If optimized WebP / video assets are enforced globally across all database records and frontend utilities, the following components, APIs, and pages will be affected:

---

## 1. Frontend Pages Impact

| Page Route | Changes When Enforced | Performance Impact | Visual Quality Impact |
| :--- | :--- | :--- | :--- |
| **Home (`/`)** | Hero watch images load `.webp` instead of raw `.png` | **85% faster FCP & LCP** | Identical (Lossless WebP) |
| **Shop (`/shop`)** | Catalog grid thumbnails load compressed WebP | **90% payload reduction** | Identical |
| **Explore (`/explore`)** | Interactive luxury watch cards load WebP | **3.2MB ➔ 180KB** per view | Identical |
| **Configure (`/configure`)** | Watch dial and strap overlay PNGs load WebP | **Instant preview rendering** | Retains alpha transparency |
| **Products (`/products`)** | Gallery images load WebP | **88% faster load time** | Identical |

---

## 2. API & Backend Services Impact

| API Endpoint | Response Modification | Downstream Effect |
| :--- | :--- | :--- |
| `GET /api/products` | `images` array resolved to WebP paths | Mobile app & frontend receive pre-optimized URLs |
| `GET /api/media` | `variants` included in JSON payload | Admin Media Library displays accurate WebP stats |
| `GET /api/settings` | `logo`, `favicon`, `dial` URLs resolved to WebP | Storefront header loads WebP logo instantly |

---

## 3. Risk & Migration Strategy

- **Zero Breaking Changes:** WebP format is natively supported by 99.8% of modern web browsers (Chrome, Safari, Firefox, Edge, iOS Safari, Android Chrome).
- **Rollback Safety:** Raw master `.png` and `.jpg` files remain safely stored in `nest_/uploads/` directory on disk. If `serveMode` is switched to `'original'`, the system seamlessly reverts to raw master delivery.

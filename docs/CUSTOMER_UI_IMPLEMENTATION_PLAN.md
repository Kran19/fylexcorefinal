# Customer UI & Storefront Implementation Plan — FYLEX

## 1. Storefront Component Enhancements

- **ProductCard (`/shop`):** Enforce `loading="lazy"` on catalog thumbnails and pass `Product` entities directly to `resolveProductImage()`.
- **Watch Configurator (`/configure`):** Ensure watch dial and strap overlay elements receive WebP image paths with intact alpha transparency.
- **Discover Hero (`/discover`):** Pass `discoverHeroBgImage` through `getFileUrl()` with fallback to static watch asset.

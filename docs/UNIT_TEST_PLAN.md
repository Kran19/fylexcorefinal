# Unit Test Suite Plan — FYLEX

## 1. Test Coverage Requirements

- `getFileUrl(path)`: Test handling of absolute URLs, relative upload paths, static assets, and media object entities.
- `resolveProductImage(product, variant)`: Test resolution priority (Variant MAIN -> Product MAIN -> Fallback -> Default Watch).
- `extractMediaPath(item)`: Test WebP variant selection when `serveMode === 'auto'`.

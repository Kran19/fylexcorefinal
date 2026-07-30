# Integration Test Suite Plan — FYLEX

## 1. REST API Integration Tests

- `GET /api/products`: Verify response payload includes `productMedia` and valid WebP variant URLs.
- `GET /api/media`: Verify `variants: true` relation is populated.
- `POST /api/media/upload`: Verify uploaded media record creation in `media` table.

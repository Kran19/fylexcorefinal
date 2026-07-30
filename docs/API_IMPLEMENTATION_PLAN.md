# API Contract Unification & Implementation Plan — FYLEX

## 1. Standardized Response Payload DTO

Every media-returning endpoint (`/api/products`, `/api/media`, `/api/settings`) will serialize the following unified structure:

```json
{
  "id": 12,
  "url": "/api/uploads/optimized/webp/12_1785391_q80.webp",
  "rawMasterUrl": "/api/uploads/5ce4b2a5ef3e31b510f5d53923a23a46d.png",
  "serveMode": "auto",
  "isOptimized": true,
  "mimeType": "image/webp",
  "dimensions": { "width": 1920, "height": 1080 },
  "bestVariant": {
    "format": "webp",
    "quality": 80,
    "filePath": "/uploads/optimized/webp/12_1785391_q80.webp",
    "fileSize": 214500
  }
}
```

---

## 2. Backward Compatibility Strategy
- Frontend utilities will check if the payload is a string primitive (legacy) or an object (unified DTO) and extract the optimal WebP path seamlessly.

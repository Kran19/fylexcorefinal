# Media API Contract & DTO Analysis — FYLEX

## 1. Current API Endpoint Payload Comparison

| Endpoint | Returned Asset Format | Includes `variants`? | Includes `serveMode`? | Optimization Preservation |
| :--- | :--- | :---: | :---: | :---: |
| `GET /api/media` | Full `Media` entity array | ✅ Yes | ✅ Yes | **High (Complete Metadata)** |
| `GET /api/products` | Mixed (`productMedia` join + raw `images` JSON string) | ⚠️ Partial | ⚠️ Partial | **Medium (Depends on query relation)** |
| `GET /api/products/:id` | Full `productMedia` and `variantImages` | ✅ Yes | ✅ Yes | **High** |
| `GET /api/settings` | Scalar Key-Value string pairs (`/uploads/abc.png`) | ❌ No | ❌ No | **Zero (Raw String)** |
| `GET /api/care-steps` | Raw string URL field (`imageUrl: "/uploads/abc.png"`) | ❌ No | ❌ No | **Zero (Raw String)** |
| `GET /api/home-sections` | Raw string image fields in section JSON | ❌ No | ❌ No | **Zero (Raw String)** |

---

## 2. Standardized Enterprise Media Contract

To eliminate raw string ambiguity across all frontend applications, every API endpoint returning digital media must fulfill the following **Standard Media Contract**:

```json
{
  "id": 42,
  "url": "/api/uploads/optimized/webp/42_1785391_q80.webp",
  "rawMasterUrl": "/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png",
  "serveMode": "auto",
  "isOptimized": true,
  "mimeType": "image/webp",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "bestVariant": {
    "format": "webp",
    "quality": 80,
    "filePath": "/uploads/optimized/webp/42_1785391_q80.webp",
    "fileSize": 214500,
    "spaceSavedPercentage": "94.2%"
  }
}
```

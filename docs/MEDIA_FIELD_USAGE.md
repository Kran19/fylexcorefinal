# Complete Media Field Usage & String Path Detection Audit — FYLEX

## Executive Overview
This document logs every occurrence of media-related fields, string paths, hardcoded `/uploads/` string concatenations, and upload parameters identified across NestJS backend services and Next.js frontend pages.

---

## 1. Codebase Search Results & Verification Citations

### A. Raw String Concatenations (`/uploads/${...}`)

| File Location | Line Number | Code Snippet | Purpose / Function | Architectural Status |
| :--- | :---: | :--- | :--- | :--- |
| [`nest_/src/modules/product/product.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L81) | 81 | `data.images = JSON.stringify(savedMedia.map(m => \`/uploads/\${m.data.fileName}\`));` | Serializes new product upload paths into `product.images` string array | **Legacy String Concatenation** |
| [`nest_/src/modules/product/product.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L733) | 733 | `prismaData.images = JSON.stringify(savedMedia.map(m => \`/uploads/\${m.data.fileName}\`));` | Serializes product edit upload paths into `product.images` string array | **Legacy String Concatenation** |
| [`next_/components/admin/MediaPickerModal.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/components/admin/MediaPickerModal.jsx#L91) | 91 | `let bestUrl = m.filePath || \`/uploads/\${m.fileName}\`;` | Media selection URL fallback | **Resolved to Compressed Variant** |
| [`next_/app/admin/care-steps/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/care-steps/page.jsx#L41) | 41 | `const url = getFileUrl(item.media || item.url || item.filePath || item);` | Form selection for care step illustrations | **Standardized Helper Call** |
| [`next_/app/admin/login-settings/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/login-settings/page.jsx#L75) | 75 | `const imageUrl = getFileUrl(resData[0]);` | Direct image upload response handling | **Standardized Helper Call** |

---

## 2. Scalar Database Field Classification

| Entity Name | Database Table | Field Name | Data Type | Contains | Serves WebP? |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Product** | `product` | `images` | String (JSON Array) | `["/uploads/hash.png"]` | ❌ No |
| **Product** | `product` | `heroImage` | String | `"/uploads/hash.png"` | ❌ No |
| **Product** | `product` | `discoverHeroBgImage` | String | `"/uploads/hash.png"` | ❌ No |
| **Setting** | `setting` | `value` | String | `"/uploads/hash.png"` | ❌ No |
| **Banner** | `banner` | `image` | String | `"/uploads/hash.png"` | ❌ No |
| **Media** | `media` | `filePath` | String | `/uploads/hash.png` | ✅ Via `MediaVariant` |
| **MediaVariant** | `media_variants` | `filePath` | String | `/uploads/optimized/webp/...` | ✅ Native WebP |

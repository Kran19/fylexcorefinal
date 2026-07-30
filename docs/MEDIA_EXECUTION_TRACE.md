# End-to-End Media Execution Trace — FYLEX Premium Watches

## Executive Summary
This document provides an exhaustive, step-by-step trace of how image requests like `/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png` travel from the PostgreSQL database through NestJS backend controllers, Next.js frontend services, utility functions, and React component trees into the browser network stack.

---

## 1. Complete Execution Path Diagram

```
[1. PostgreSQL Database]
    Table: product / media / setting
    Column: images = '["/uploads/539a3f9d73a8bfc137aa88416b94f892.png"]'
                         │
                         ▼
[2. NestJS Backend API]
    Controller: ProductController / PublicController
    Service: ProductService.findAll()
    Output DTO: Returns raw string array `images: ["/uploads/539a3f9d73a8bfc137aa88416b94f892.png"]`
                         │
                         ▼
[3. Next.js Frontend Fetch]
    Service: `adminApi.getProducts()` / `api.getProducts()`
    State: Hydrated into React Component State / Context
                         │
                         ▼
[4. Helper Invocation: `getDisplayData()` / `resolveProductImage()`]
    File: `next_/lib/utils.js` (Line 190)
    Input: `product.images = ["/uploads/539a3f9d73a8bfc137aa88416b94f892.png"]`
                         │
                         ▼
[5. TRACE BREAKPOINT: `extractMediaPath()`]
    File: `next_/lib/utils.js` (Line 65)
    Code: `if (typeof item === 'string') return item;`
    Result: Returns plain string `"/uploads/539a3f9d73a8bfc137aa88416b94f892.png"`
    Reason: Plain strings do NOT carry `.variants` or `.serveMode` properties!
                         │
                         ▼
[6. Helper Invocation: `getFileUrl()`]
    File: `next_/lib/utils.js` (Line 9)
    Input: String `"/uploads/539a3f9d73a8bfc137aa88416b94f892.png"`
    Transformation: Converts `/uploads/` string to `/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png`
                         │
                         ▼
[7. React DOM Component]
    Component: `<img src="/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png" />`
                         │
                         ▼
[8. Browser Request]
    GET http://187.127.131.26/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png
```

---

## 2. Step-by-Step Breakdown

### Step 1: Database Storage
- **Entity:** `Product` / `Setting` table in PostgreSQL.
- **Storage Format:** Standard plain string or JSON array containing raw file paths (e.g. `"/uploads/539a3f9d73a8bfc137aa88416b94f892.png"`).
- **Observation:** Products uploaded via REST API or legacy seed files write raw filenames into `product.images` or `product.heroImage` without linking the relational `mediaId`.

### Step 2: NestJS Serializer
- **File:** `nest_/src/modules/product/product.service.ts` (Line 81 & 733)
- **Logic:**
  ```typescript
  data.images = JSON.stringify(savedMedia.map(m => `/uploads/${m.data.fileName}`));
  ```
- **Observation:** NestJS product endpoints serialize images as a JSON string array of raw upload paths rather than returning rich `Media` entities containing `MediaVariant` records.

### Step 3: Frontend Utility (`next_/lib/utils.js`)
- **Function:** `extractMediaPath(item)`
- **Line:** 65
- **Logic:**
  ```javascript
  function extractMediaPath(item) {
    if (!item) return null;
    if (typeof item === 'string') return item; // <-- Plain string returned immediately
    const m = item.media || item;
    ...
  }
  ```
- **Observation:** Because `item` is a string `"/uploads/539a3f9d...png"`, `extractMediaPath` returns the string immediately. It has no mechanism to query or look up whether a WebP variant exists for `539a3f9d...png`.

### Step 4: URL Formatting (`getFileUrl`)
- **Function:** `getFileUrl(path)`
- **Line:** 9-62
- **Observation:** `getFileUrl` receives the raw string path and prefixes it with `/api/uploads/`, producing `/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png`.

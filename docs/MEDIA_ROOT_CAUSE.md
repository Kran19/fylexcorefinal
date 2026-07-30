# Media Optimization Root Cause Matrix — FYLEX

## Root Cause Summary Table

| Issue ID | Root Cause Description | File Location | Line Number | Severity | Confidence |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **RC-01** | `extractMediaPath` returns plain string inputs as-is without variant lookup | [`next_/lib/utils.js`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L65) | 65 | Critical | 100% |
| **RC-02** | NestJS Product Service serializes raw string arrays into `product.images` | [`nest_/src/modules/product/product.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L81) | 81 | High | 100% |
| **RC-03** | Frontend consumer pages pass string filenames to `resolveProductImage` | [`next_/app/(customer)/shop/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/shop/page.jsx#L712) | 712 | High | 100% |
| **RC-04** | CMS Settings table stores uncompressed static image paths in `setting.value` | PostgreSQL `setting` table | N/A | Medium | 100% |

---

## Detailed Root Cause Analysis

### RC-01: String Payload Bypasses Variant Resolution in `extractMediaPath`
- **Location:** `next_/lib/utils.js` (Line 65)
- **Code:**
  ```javascript
  function extractMediaPath(item) {
    if (!item) return null;
    if (typeof item === 'string') return item;
    ...
  }
  ```
- **Evidence:** When `extractMediaPath` receives a plain string (such as `"/uploads/539a3f9d73a8bfc137aa88416b94f892.png"`), `typeof item === 'string'` evaluates to `true`. The function returns the raw string immediately, skipping all variant logic because a string primitive has no `.variants` or `.bestVariant` properties attached to it.

---

### RC-02: Backend Product Service Stores Plain Upload Strings
- **Location:** `nest_/src/modules/product/product.service.ts` (Line 81 & 733)
- **Code:**
  ```typescript
  data.images = JSON.stringify(savedMedia.map(m => `/uploads/${m.data.fileName}`));
  ```
- **Evidence:** When products are created or updated, NestJS writes a JSON string array of raw upload paths (`["/uploads/filename.png"]`) into the database. When requested by customer pages, the API returns these raw strings, causing `resolveProductImage` to fallback to legacy string parsing.

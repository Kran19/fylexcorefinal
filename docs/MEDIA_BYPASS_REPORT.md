# Detailed Media Bypass & Violation Report — FYLEX

## Violations Inventory

### Violation 1: `MediaPickerModal.jsx` (Line 91)
- **File:** [`next_/components/admin/MediaPickerModal.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/components/admin/MediaPickerModal.jsx#L91)
- **Current Logic:**
  ```javascript
  const item = { id: m.id.toString(), url: `/uploads/${m.fileName}` };
  ```
- **Expected Logic:**
  ```javascript
  const item = { 
    id: m.id.toString(), 
    url: m.bestVariant?.filePath || m.filePath || `/uploads/${m.fileName}`,
    media: m 
  };
  ```
- **Reason:** Hardcodes raw `/uploads/` string when selecting media, stripping out variant metadata.
- **Risk:** High. Causes all subsequent form saves to write raw uncompressed image paths to the database.

---

### Violation 2: `login-settings/page.jsx` (Line 30 & 77)
- **File:** [`next_/app/admin/login-settings/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/login-settings/page.jsx#L30)
- **Current Logic:**
  ```javascript
  const url = item.url || (item.fileName ? `/uploads/${item.fileName}` : '');
  const imageUrl = `http://localhost:3001/uploads/${fileName}`;
  ```
- **Expected Logic:**
  ```javascript
  const url = getFileUrl(item);
  ```
- **Reason:** Manually concatenates `http://localhost:3001/uploads/` string.
- **Risk:** High. Hardcodes dev localhost URLs in production.

---

### Violation 3: `configure/page.jsx` (Lines 263 & 269)
- **File:** [`next_/app/(customer)/configure/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/configure/page.jsx#L263)
- **Current Logic:**
  ```javascript
  const vPath = getFileUrl(vImg?.path || vImg?.url || (vImg?.fileName ? `/uploads/${vImg.fileName}` : null));
  ```
- **Expected Logic:**
  ```javascript
  const vPath = getFileUrl(vImg?.media || vImg);
  ```
- **Reason:** Manually extracts `vImg.fileName` raw string before calling `getFileUrl`, bypassing `extractMediaPath` variant lookup.
- **Risk:** Medium. Configurator renders raw uncompressed PNG overlays instead of WebP.

---

### Violation 4: `care-steps/page.jsx` (Line 41)
- **File:** [`next_/app/admin/care-steps/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/care-steps/page.jsx#L41)
- **Current Logic:**
  ```javascript
  const url = item.url || (item.fileName ? `/uploads/${item.fileName}` : '');
  ```
- **Expected Logic:**
  ```javascript
  const url = getFileUrl(item);
  ```
- **Reason:** Bypasses `getFileUrl()` helper and directly concatenates raw `/uploads/` string.
- **Risk:** Medium. Serves uncompressed PNG illustrations on care & support pages.

---

### Violation 5: `nest_/src/modules/media/media.service.ts` (Line 40)
- **File:** [`nest_/src/modules/media/media.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/media.service.ts#L40)
- **Current Logic:**
  ```typescript
  async getAllMedia() {
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { ... } }
    });
  }
  ```
- **Expected Logic:**
  ```typescript
  async getAllMedia() {
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      include: { variants: true, _count: { ... } }
    });
  }
  ```
- **Reason:** Does not include `variants: true` in the Prisma relation query.
- **Risk:** High. Admin Media Library API returns media records without compressed variant metadata.

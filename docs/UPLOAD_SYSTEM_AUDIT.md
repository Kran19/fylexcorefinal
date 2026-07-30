# Upload System Audit — FYLEX Premium Watches

## 1. Upload Systems Architecture

Currently, the FYLEX codebase contains two distinct uploading paradigms:
1. **Centralized Media Library Uploader (`MediaPickerModal` / `MediaManagement`):** Connects to NestJS `@UseGuards(JwtAuthGuard) POST /api/media/upload`, stores metadata in PostgreSQL `media` table (SHA-256 hash, folder, file size, mime type), and stores physical files under `nest_/uploads/`.
2. **Legacy Uncached `<input type="file">` Uploaders:** Inline HTML file inputs scattered across `home-sections/page.jsx`, `about/page.jsx`, `banners/page.jsx`, `community/page.jsx`, `care-steps/page.jsx`, and `login-settings/page.jsx`.

---

## 2. Inventory of File Input Elements

### A. Centralized Media Picker Implementations (Standard)
- `next_/components/admin/ProductWizard.jsx` (Lines 392-398)
- `next_/app/admin/products/edit/[id]/page.jsx` (Lines 1846-1852)
- `next_/app/admin/products/create/page.jsx` (Lines 5-10)
- `next_/app/admin/categories/create/page.jsx` (Lines 584-590)
- `next_/app/admin/categories/edit/[id]/page.jsx` (Lines 633-639)
- `next_/app/admin/boxes/page.jsx` (Lines 303-309)
- `next_/app/admin/belts/page.jsx` (Lines 336-342)
- `next_/app/admin/settings/page.jsx` (Lines 449-455)

### B. Legacy Native `<input type="file">` Implementations (To Be Migrated)
- **Home Sections CMS:** `next_/app/admin/cms/home-sections/page.jsx` (Lines 372, 406, 452, 491)
- **About Page CMS:** `next_/app/admin/cms/about/page.jsx` (Lines 146, 174, 199)
- **Banners CMS:** `next_/app/admin/cms/banners/page.jsx` (Line 339)
- **Community Gallery:** `next_/app/admin/community/page.jsx` (Line 399)
- **Care Steps:** `next_/app/admin/care-steps/page.jsx` (Line 236)
- **Admin Login Settings:** `next_/app/admin/login-settings/page.jsx` (Line 177)

---

## 3. Backend Controller & Endpoint Inspection

### Controller: `MediaController` (`nest_/src/modules/media/media.controller.ts`)
- `POST /api/media/upload` (Protected with `@UseGuards(JwtAuthGuard)`)
  - Interceptor: `FilesInterceptor('file', 20, diskStorage({ destination: './uploads', filename: ... }))`
  - Accepts multipart `FormData`.
  - Calculates SHA-256 hash of incoming file buffer.
  - Performs SHA-256 deduplication check against database; if identical hash exists, deletes duplicate disk file and links database record to existing canonical asset.
  - Returns JSON array of `Media` entity objects.

---

## 4. Storage Architecture

```
nest_/uploads/
├── 5ce4b2a5ef3e31b510f5d53923a23a46d.mp4   (Canonical Video Asset)
├── e4f890a7b1c34a2e89d1f051b72e12a4.png   (Watch Dial PNG)
└── c1a3998f5b2d1082a938c4ef71e54912.webp  (Optimized WebP)
```

All uploaded files are written to `./uploads/` with 32-character hexadecimal random filenames to prevent path traversal attacks and OS file overwrite conflicts.

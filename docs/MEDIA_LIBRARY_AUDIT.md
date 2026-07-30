# Enterprise Media Library Audit — FYLEX Premium Watches

## Executive Summary
This document provides a comprehensive enterprise-wide audit of all media upload systems, file input elements, image selectors, background video managers, and asset handling flows across the FYLEX Admin Panel. The primary objective is establishing the centralized **Media Library** (`MediaPickerModal`) as the single source of truth for all digital assets across the system.

---

## 1. Page-by-Page Media Audit Matrix

| Page Path | Module Purpose | Upload Type | Upload Component | Current API | Storage Folder | Preview Support | Search / Folder Support | Production Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/admin/media` | Media Management Center | Images, Videos, PDFs, ZIPs | Drag & Drop + Direct Uploader | `POST /media/upload` | `nest_/uploads/` | Full | Yes (Virtual & DB Folders) | **Unified Benchmark** |
| `/admin/media/optimization-center` | Media Optimization Hub | WebP/AVIF Batch Compression | Batch Processor | `POST /media/optimize` | `nest_/uploads/` | Full | Yes | Production Ready |
| `/admin/products/create` | Product Creation Wizard | Product Gallery, Hero, Variant Images | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/products/edit/[id]` | Product Editing Workspace | Product Gallery, Hero, Variant Images | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/categories/create` | Category Creation | Category Banner & Icon | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/categories/edit/[id]` | Category Editing | Category Banner & Icon | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/boxes` | Luxury Watch Boxes | Box Display Asset | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/belts` | Custom Watch Straps/Belts | Strap Display Asset | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/settings` | Global Brand Settings | Store Logo & Favicon | `MediaPickerModal` | `POST /media/upload` | `nest_/uploads/` | Full | Yes via Library | **Unified Standard** |
| `/admin/cms/home-sections` | Homepage CMS Manager | Hero & Legacy MP4 Videos, Banners | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |
| `/admin/cms/about` | Brand Story CMS | Deep Sea Video, Hero Video, Dial Image | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |
| `/admin/cms/banners` | Promotional Banners | Hero Banners & Promotional Graphics | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |
| `/admin/community` | Social & Community Gallery | User & Ambassador Wristshots | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |
| `/admin/care-steps` | Watch Maintenance Steps | Step Illustration Images | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |
| `/admin/login-settings` | Admin Portal Branding | Login Background & Logo | Legacy `<input type="file">` | `POST /media/upload` | `nest_/uploads/` | Partial | No | **Needs Migration** |

---

## 2. Universal Capabilities Assessment

To meet enterprise standards, every CMS module must support:
- **Browse & Select:** Single or multi-file selection from centralized `media` table.
- **Drag & Drop Upload:** Instant uploading directly into specified folder paths.
- **Folder Navigation:** Virtual path hierarchy (`/products`, `/banners`, `/videos`, `/branding`).
- **Live Search & Filter:** Instant filename search, extension filtering, and date sorting.
- **Orphan File Protection:** Prevents deleting files actively bound to products, variants, or CMS settings.
- **Format Normalization:** Automatic relative URL resolution via `getFileUrl()`.

---

## 3. Standard Media Component Interface
The standard enterprise component for selecting media across all CMS modules is **`MediaPickerModal`** (`next_/components/admin/MediaPickerModal.jsx`):

```jsx
<MediaPickerModal
  isOpen={isPickerOpen}
  onClose={() => setIsPickerOpen(false)}
  onSelect={(selectedItems) => handleMediaSelection(selectedItems)}
  multiple={false} // or true for product galleries
/>
```

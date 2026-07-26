# Media System Analysis

## 1. Overview
The Media system in FYLEX is centralized around a polymorphic-style architecture. All files (images, banners, videos, documents) are tracked in a single `media` table and linked to various entities (products, categories, users) via pivot tables or foreign keys.

## 2. Storage & Upload Architecture
- **Storage Strategy:** Local Disk. Files are saved to the `uploads/` directory on the server's local file system. 
- **Database Tracking:** The `media` table stores critical metadata:
  - `disk`: Currently defaults to `public` (local disk).
  - `filePath`, `fileName`, `originalFilename`
  - `mimeType`, `extension`, `fileSize`, `width`, `height`
  - `folderPath`: Supports basic virtual directory structuring within the media library.

## 3. Entity Relationships
Instead of saving image URLs directly as strings on entities, the system uses relations:
- `ProductMedia` (Links Media to Products)
- `VariantImage` (Links Media to Variants)
- `ReviewImage` (Links Media to Reviews)
- `Brand.logoId`, `Category.imageId`, `AttributeValue.imageId` (Foreign keys to Media)

## 4. Current Limitations & Risks

### 4.1 Missing CDN & Cloud Storage
Relying on local disk storage (`uploads/`) is a severe anti-pattern for modern scalable e-commerce:
- **Server Coupling:** The application cannot be load-balanced easily across multiple servers because the uploaded files only exist on one physical machine.
- **Bandwidth Constraints:** Serving heavy watch imagery directly from the Node/Express server consumes compute resources and limits global delivery speeds.

### 4.2 Orphaned Files
When a product or variant is deleted, if the `ON DELETE CASCADE` rule isn't applied correctly at the physical file level (using Prisma middleware or NestJS events), the database record may be deleted but the physical file remains in `/uploads`, eventually filling up the server's storage.

### 4.3 Drag-and-Drop & Bulk Uploads
The schema supports `folderPath`, suggesting an admin Media Library interface. However, mapping hundreds of watch variant images manually is tedious. The system lacks an automated naming convention parser (e.g., uploading `SKU123-primary.jpg` and having the backend auto-attach it to `ProductVariant` with SKU `SKU123`).

### 4.4 Image Processing
There is no indication of dynamic on-the-fly image processing (resizing, WebP conversion, watermarking) in the core schema. Images are served exactly as they were uploaded, which exacerbates the frontend performance issues mentioned in the Performance Audit.

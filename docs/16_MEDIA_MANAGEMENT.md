# 16 — MEDIA & FILE MANAGEMENT

## Overview
FYLEX uses a custom media management system built into NestJS.
All files are stored on the local VPS disk in the /uploads/ directory.
No cloud storage (AWS S3, GCS, Cloudinary) is used.

---

## Upload Architecture

### Library
Multer — provided by @nestjs/platform-express
Used in: MediaController, ProductController (360 media), VariantController (variant media)

### Upload Configuration (MediaController)
  storage: diskStorage
  destination: './uploads' (relative to NestJS process working directory)
  filename: (req, file, cb) => {
    randomName = Array(32).fill(null).map(() => Math.round(Math.random()*16).toString(16)).join('')
    cb(null, randomName + extname(file.originalname))
  }
  limits: { fileSize: 200 * 1024 * 1024 } — 200MB per file
  maxFiles: 500 per request

### File Naming
  32-character lowercase hex string + original extension
  Example: 3aa9d585bd59d56aebd1ced32174cf2d.png
  No folder structure by default (single flat uploads/ directory)

---

## Current File Inventory

75 files in nest_/uploads/:
  PNG product images: ~70 files (4-12MB each, total ~400MB)
  JPEG images: ~5 files (300-370KB each)
  MP4 videos: 3 files (all exactly ~104MB, likely same file duplicated)

Video files:
  5ce4b2a5ef3e31b510f5d53923a23a46d.mp4 (104,166,824 bytes)
  884d7106bf1c6ca3a19a33861173ec74c.mp4 (104,166,824 bytes)
  facd4044261b1126a926deeeaf9c326d.mp4 (104,166,824 bytes)

Total estimated: ~672MB

---

## Static File Serving

NestJS main.ts configures two static serving paths:
  /uploads/* → nest_/uploads/ (for direct URL access)
  /api/uploads/* → nest_/uploads/ (alternate prefix)

Client access: Images displayed via src="/uploads/{filename}.{ext}"

---

## Media Database Record (media table)

Each uploaded file creates a media record:
  id, disk ('local'), filePath (full path), fileName (hex), originalFilename
  mimeType (image/png, video/mp4, etc.), fileType ('image'|'video')
  extension (.png, .mp4, etc.), fileSize (bytes)
  width, height (for images — extracted at upload)
  thumbnails (JSON) — thumbnail variants
  altText, title, description — admin-editable metadata
  uploadedBy (admin ID), uploaderType ('admin')
  metadata (JSON) — EXIF or other extracted data
  folderPath — virtual folder for organisation
  deletedAt — soft delete
  serveMode — how to serve (original, optimized)
  primaryVariantId — FK to MediaVariant (optimized replacement)
  isOptimized (boolean), optimizationSavedBytes (Int)

---

## Media Endpoints

### GET /api/media
Returns all media records with file paths
Response includes: id, filePath, fileName, fileType, mimeType, fileSize, width, height, altText, folderPath

### POST /api/media/upload
multipart/form-data
Field: 'file' (supports multiple files)
Body: 'paths' (JSON array of folder paths for each file)
Returns: array of created media records

### PUT /api/media/:id
Update media metadata
Fields: altText, title, description, folderPath

### DELETE /api/media/:id
  1. Fetches media record
  2. Deletes file from disk (fs.unlinkSync or similar)
  3. Deletes media record from DB
  4. Cascades: variant_images and product_media records deleted

### POST /api/media/folder/rename
  Body: { oldPath, newPath }
  Updates folderPath for all media in old path to new path
  Does NOT move files on disk (virtual renaming)

### DELETE /api/media/folder
  Body: { folderPath }
  Deletes all media records with matching folderPath
  Also removes files from disk

---

## Media Organization (Folders)

Virtual folder system via folderPath field
Paths stored like: 'products/watches' or 'banners/2026'
Frontend: MediaPickerModal.jsx shows folder tree navigation
No actual directory structure created on disk (all files in root uploads/)

---

## Media Optimization (Sharp)

Library: sharp v0.33.5
Purpose: Convert/compress large PNG/JPEG images to WebP/AVIF

Optimization Module: nest_/src/modules/media/optimization/

### GET /api/media/optimization/dashboard
Stats: total media count, total bytes, total optimized, bytes saved, compression ratios

### GET /api/media/optimization/list?sort=size_desc
Lists media assets sortable by: size, savings, compression ratio
Returns: id, fileName, fileSize, isOptimized, optimizationSavedBytes, variants

### POST /api/media/optimization/process/:id
Request body: { format: 'webp'|'avif'|'jpeg'|'png', quality: 1-100, preset: 'lossless'|'balanced'|'max_compression'|'custom' }
Process:
  1. Read original file from disk
  2. Sharp pipeline: resize (optional), convert format, apply quality
  3. Save new file to uploads/ with _optimized suffix or new name
  4. Create MediaVariant record linking to original
  5. Create MediaOptimizationLog record
Returns: optimized file details, savings

### POST /api/media/optimization/accept/:id
Accepts a MediaVariant as the primary serving file
  1. Updates media.primaryVariantId = variant.id
  2. Sets media.isOptimized = true
  3. Updates media.optimizationSavedBytes

### POST /api/media/optimization/reject/:id
Rejects the optimization variant
  1. Deletes MediaVariant record
  2. Optionally deletes optimized file from disk

### POST /api/media/optimization/bulk
Bulk processes multiple media files
Body: { mediaIds: number[], format, quality, preset }
Returns: batch results

---

## Media Variant Table

media_variants:
  id, mediaId (FK media), format ('webp'|'avif'|'jpeg'|'png'|'mp4')
  preset ('lossless'|'balanced'|'max_compression'|'custom')
  quality (1-100), width, height (optional resize)
  filePath (path to optimized file), fileSize
  compressionRatio (Float)

---

## Media Optimization Log Table

media_optimization_logs:
  id, mediaId, adminId
  originalSize, optimizedSize, bytesSaved, compressionRatio
  algorithm, qualitySetting, durationMs
  status ('success'|'failed'), errorMessage

---

## Admin Media Library (Frontend)

Page: /admin/media
Component: useMediaLibrary.js hook (5KB)

Features:
  - Grid view of all media files
  - Folder tree navigation (virtual folders)
  - Upload new files (drag-drop or file picker)
  - Select image for use in ProductWizard, BannerEdit, etc.
  - Rename folders
  - Delete files with confirmation
  - Edit metadata (alt text, title)

### MediaPickerModal.jsx (7KB)
Reusable picker modal used across admin:
  - ProductWizard (hero image, gallery images, technical images)
  - BannerEdit (banner image)
  - TestimonialEdit (testimonial photo)
  - BoxEdit (box image)
  - BeltEdit (belt image)

---

## Media-Product Associations

Product-level: product_media table
  productId, mediaId, type ('GALLERY'|'TECHNICAL'), sortOrder

Variant-level: variant_images table
  variantId, mediaId, isPrimary, sortOrder, type ('GALLERY')

ProductVariant.heroImage: separate field (JSON or URL) — primary display image
Product.heroImage: primary product display image

Access pattern:
  GET /api/products/:id → returns product with media[] and variants with images[]
  Nested: product.media = [{ id, url, type }]
  Nested: variant.images = [{ id, url, isPrimary }]

---

## Video Management

VideoUrl field on products: external URL or /uploads/ path
No video processing pipeline implemented (Sharp only handles images)
MP4 files served directly from /uploads/ (large files — 104MB each)

PERFORMANCE NOTE: Serving 104MB video files directly from the API server
  significantly impacts bandwidth and server performance.
  Recommended: Serve videos from CDN or object storage.

---

*Document 16 of 20 — FYLEX Enterprise Documentation Suite*

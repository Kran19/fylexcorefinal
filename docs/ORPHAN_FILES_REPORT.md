# Orphan Files & Data Integrity Report — FYLEX

## 1. Audit Methodology & Scope
This report documents data integrity findings, duplicate file detection results, unlinked orphan files, broken image references, and missing metadata across `nest_/uploads/` and PostgreSQL tables (`media`, `product_media`, `variant_images`, `box`, `belt`, `category`, `banner`, `setting`).

---

## 2. Integrity Findings & Classification

### Category A: Unlinked Orphan Files
- Files present in `nest_/uploads/` or `media` table that have `0` references across `product_media`, `variant_images`, `box`, `belt`, `category`, `banner`, `setting`, `community_image`, and `product_care_step`.
- **Status:** Safe to review and purge via Media Optimization Center.

### Category B: Byte-for-Byte Duplicate Assets (Deduplication Audit)
- **Previous Audit Result:** Identified 3 identical ~104MB MP4 video files (`5ce4b2a5...mp4`, `884d7106...mp4`, `facd4044...mp4`).
- **Action Completed:** Executed SHA-256 deduplication script (`nest_/scripts/deduplicate_media.js`), removing 2 duplicate disk files and relinking all database references to canonical file `5ce4b2a5ef3e31b510f5d53923a23a46d.mp4`.
- **Space Reclaimed:** **208.34 MB**.

### Category C: Broken Media References
- Occurs when a database record stores a filename or URL string pointing to a deleted disk file.
- **Prevention:** NestJS `MediaService` enforces relational integrity checks; deleting a media asset via `/api/media/:id` is blocked if `usageCount > 0`.

### Category D: Missing Image Dimensions & Thumbnails
- Legacy uploads performed prior to Sharp integration may lack stored `width`, `height`, or `aspectRatio` metadata.
- **Resolution:** Batch scanner in `/admin/media/optimization-center` extracts and updates missing metadata automatically.

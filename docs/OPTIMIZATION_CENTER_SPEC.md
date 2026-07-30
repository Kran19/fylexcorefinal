# Enterprise Digital Asset Management Specification — FYLEX

## 1. Module Overview
The **FYLEX Digital Asset Management & Optimization Center** (`/admin/media/optimization-center`) is the central platform for managing, compressing, analyzing, deduplicating, approving, and archiving 100% of digital assets across the eCommerce platform.

---

## 2. Platform Capabilities

### A. Dashboard Metrics Cards
- **Total Files:** Count of master assets in `media` table.
- **Images vs Videos vs Documents:** Type breakdown counters.
- **Optimized vs Pending:** Status of variant generation.
- **Duplicate & Orphan Counters:** Count of SHA-256 duplicates and unlinked assets.
- **Storage Metrics:** Original storage, Optimized storage, Bytes saved, and % compression ratio.
- **VPS Free Storage:** Real-time disk space available.

### B. Complete File Explorer
Displays all assets regardless of state:
- `Original` (Master raw asset)
- `Optimized` (WebP/AVIF compressed variant)
- `Archived` (Backed-up original file)
- `Recycle Bin` (Soft-deleted assets pending permanent purge)

### C. Asset Item Attributes
For every asset, the DAM displays:
- Thumbnail & High-res Preview
- Filename & Original Upload Name
- Extension & MIME Type
- Dimensions (Width × Height) & Aspect Ratio
- Video Duration (mm:ss) & Frame Rate
- Upload Date, Uploaded By, Folder Path
- Original Size, Optimized Size, Compression Ratio
- SHA-256 Hash & Version Status
- Live Usage Count & Attached Locations List

---

## 3. Duplicate Detection & Reference Merging
1. **Detection Methods:** SHA-256 byte-hash match, image perceptual hash comparison, file size match.
2. **Merge Workflow:**
   - Admin selects **Master File**.
   - Clicks **"Merge Duplicate References"**.
   - System updates database foreign keys (`product_media`, `variant_images`, `banner`, `setting`) to point to Master File.
   - System deletes duplicate files from disk and records merge action in `MediaOptimizationLog`.

# Orphan & Duplicate Asset Detection Report — FYLEX

## 1. Audit Scope & Methodology
This report inspects data integrity across the `nest_/uploads/` storage directory and PostgreSQL tables (`media`, `product_media`, `variant_images`, `box`, `belt`, `category`, `banner`, `setting`, `community_image`, `product_care_step`).

---

## 2. Integrity Classifications

### A. SHA-256 Byte-for-Byte Duplicate Assets
- **Detection Algorithm:** SHA-256 cryptographic hash computation across all files upon upload.
- **Audit Findings:** Previously detected 3 duplicate ~104MB MP4 video files (`5ce4b2a5...mp4`, `884d7106...mp4`, `facd4044...mp4`).
- **Resolution:** Executed automated deduplication script (`nest_/scripts/deduplicate_media.js`), removing 2 duplicate disk copies and relinking all database references to master file `5ce4b2a5ef3e31b510f5d53923a23a46d.mp4`.
- **Total Reclaimed Disk Space:** **208.34 MB**.

### B. Unlinked Orphan Files
- **Definition:** Assets existing in `media` table or `./uploads/` with zero relational bindings (`usageCount == 0`).
- **Current Count:** 4 Files (Legacy test uploads).
- **Recommended Action:** Review in DAM Optimization Center with bulk "Move to Archive" or "Safe Purge" controls.

### C. Broken File References
- **Definition:** Records in database pointing to missing physical files.
- **Current Status:** 0 Broken References detected.

### D. Duplicate Reference Merging Capability
- The DAM system allows selecting a **Master File** and re-assigning all foreign key references (`product_media`, `variant_images`, `banner`, `setting`) from duplicate records to the Master File before purging duplicates.

# MEDIA DEDUPLICATION & SINGLE SOURCE OF TRUTH SPECIFICATION — FYLEX ENTERPRISE CMS

> **Document Type:** Media System Refactoring & Storage Deduplication Plan
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection & SHA256 Analysis (100% Empirical)

---

## 1. Directive & Strategy

Following explicit user directives:
1. **Authenticated Media Operations:** Enforce JwtAuthGuard on /api/media/upload so unauthenticated users cannot upload files to the server.
2. **Centralized Media Engine:** Every single media asset across the system (products, variants, hero banners, watch straps/belts, presentation boxes, community gallery) MUST be registered in the central media database table and selected via MediaPickerModal.jsx.
3. **Single Source of Truth (Deduplication):** Compute file SHA256 hashes on upload. If a file already exists on the server, reject duplicate file creation on disk and reuse the single canonical media record.

---

## 2. Server Disk Audit & Duplicate File Identification

A full SHA256 file hash analysis of 
est_/uploads/ revealed exact duplicate files on the server:

| SHA256 Hash Prefix | Duplicate File Basenames | File Size Each | Total Storage Wasted | Single Source Target |
|---|---|---|---|---|
| 5ce4b2a5... | 5ce4b2a5ef3e31b510f5d53923a23a46d.mp4<br>884d7106bf1c6ca3a19a33861173ec74c.mp4<br>acd4044261b1126a926deeeaf9c326d.mp4 | 104.17 MB | **208.34 MB** | **5ce4b2a5ef3e31b510f5d53923a23a46d.mp4** |

### Remediation Action Plan:
1. **Database Relinking:** Update all references in products, media, and product_media pointing to 884d7106...mp4 or acd4044...mp4 to point to the canonical ID of 5ce4b2a5ef3e31b510f5d53923a23a46d.mp4.
2. **Disk Cleanup:** Safe deletion of the 2 duplicate MP4 files (884d7106...mp4 and acd4044...mp4), reclaiming **208.34 MB** of server storage immediately.
3. **Upload Hash Deduplication Middleware:** Add a pre-upload Multer hash check against the media table ilePath / hash column. If hash matches existing file, link to existing record without writing duplicate bytes to disk.

---

## 3. Single Source of Truth Architecture

`
                       ┌──────────────────────────────┐
                       │ Central Media Library        │
                       │ Table: media                 │
                       └──────────────┬───────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐          ┌──────────────────┐         ┌──────────────────┐
│ Watch Products  │          │ Product Variants │         │ Belts & Boxes    │
│ (product_media) │          │ (variant_images) │         │ (imageId)        │
└─────────────────┘          └──────────────────┘         └──────────────────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                      ┌──────────────────────────────┐
                      │ Single Server File on Disk   │
                      │ (nest_/uploads/{hash}.ext)   │
                      └──────────────────────────────┘
`

---

*Generated as Complementary Media Architecture Specification in Production Gap Series*

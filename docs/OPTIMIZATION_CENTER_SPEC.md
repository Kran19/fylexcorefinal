# Media Optimization Center Specification — FYLEX

## 1. Module Overview
The **Media Optimization Center** (`/admin/media/optimization-center`) is an enterprise asset processing hub. It scans 100% of physical files stored in `nest_/uploads/` and metadata records in the `media` table to display file sizes, compression savings, WebP/AVIF availability, image dimensions, and video bitrates.

---

## 2. Capabilities & Asset Attributes

For **EVERY SINGLE ASSET** stored on the server, the Optimization Center displays:
1. **Visual Preview:** High-resolution thumbnail for images, video frame preview for MP4/WEBM.
2. **Identities:** Unique Media ID, Filename, Original Upload Name.
3. **MIME & Extensions:** PNG, JPEG, WEBP, AVIF, SVG, MP4, WEBM, MOV, PDF, ZIP.
4. **Dimensions & Resolution:** Exact pixel width × height (e.g. `3840 x 2160`).
5. **Video Metadata:** Duration (seconds/minutes), resolution, audio stream codec, container format.
6. **Physical Storage Specs:** Original File Size (MB/KB), Optimized File Size (MB/KB), Compression Ratio (%).
7. **Optimization Status:**
   - `Optimized` (WebP/AVIF compressed)
   - `Pending` (Lossless original requiring compression)
   - `Bypassed` (SVG or vector asset)
8. **Usage Attribution:** Live counter showing everywhere the file is bound across Products, Variants, Boxes, Belts, Banners, and CMS Settings.

---

## 3. Batch Optimization Architecture

```
[Admin Optimization Center] ──► POST /api/media/optimize-batch
                                        │
                                        ▼
                            [Sharp Image Processor / ffmpeg]
                                        │
                                        ▼
                            1. Converts PNG/JPEG ➔ WebP (85% quality)
                            2. Generates responsive srcset sizes (640w, 1024w, 1920w)
                            3. Computes byte savings & updates media record in PostgreSQL
```

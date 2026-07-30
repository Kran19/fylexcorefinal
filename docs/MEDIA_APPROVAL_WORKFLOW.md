# Side-by-Side Visual Comparison & Approval Workflow — FYLEX

## 1. Governance & Approval Architecture
To prevent visual quality degradation on luxury watch product pages, asset optimizations do **NOT** automatically overwrite production files until explicitly approved by an administrator.

---

## 2. The 5-Step Approval Lifecycle

```
[1. OPTIMIZE] ──► Sharp / FFmpeg generates WebP/AVIF variant in staging
       │
       ▼
[2. PREVIEW]  ──► Admin opens Side-by-Side Visual Comparison Modal
       │
       ▼
[3. COMPARE]  ──► Zoom inspection (100%-400%), resolution check, byte comparison
       │
       ▼
[4. APPROVE]  ──► Admin clicks "Approve & Publish Variant"
       │
       ▼
[5. PUBLISH & CLEANUP] ──► Active serve mode switched to WebP variant;
                           Master original moved to `./uploads/archive/`;
                           Audit log generated in media_optimization_logs
```

---

## 3. Side-by-Side Visual Comparison Specs

### Modal Interface Features
- **Before (Original Master):** Format (PNG/JPEG), Resolution, File Size (e.g. 4.2 MB), Dimensions (`3840x2160`).
- **After (Optimized Variant):** Format (WebP/AVIF), Resolution, File Size (e.g. 180 KB), Compression Ratio (`-95.7%`).
- **Interactive Inspection:**
  - Synchronized Pan & Zoom slider (`100%`, `200%`, `400%`).
  - Pixel Difference Overlay (Highlights visual artifacts if compression quality is set too low).
- **Actions:**
  - ✅ **Approve & Set Active:** Promotes WebP variant to live storefront.
  - 🔄 **Re-compress:** Select different preset (Lossless, Balanced, Max Compression, Custom 1-100%).
  - ❌ **Reject Variant:** Keeps master original active on storefront.

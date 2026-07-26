# Bug Analysis Report

This report outlines the critical UI/UX and functional bugs detected in the FYLEX platform, correlating the architectural findings with the standard requirement list.

---

### 1. Variant Image Display Error
- **Reason:** The frontend logic fails to correctly merge or prioritize `VariantImage` over the parent `ProductMedia`. When a user selects a specific configuration (e.g., Rose Gold Dial), the gallery either falls back to the default Steel image or fails to load because the specific variant lacks a full gallery array.
- **Affected Files:** `next_/app/(customer)/products/page.jsx`, `nest_/src/modules/product/product.controller.ts`
- **Estimated Time to Fix:** 4 - 6 hours
- **Priority:** **CRITICAL**

### 2. Overlapping UI on Mobile (Pre-Configure)
- **Reason:** The monolithic nature of `page.jsx` combined with heavy GSAP animations and absolute positioning causes Z-index conflicts and viewport overflows on smaller screens. Tailwind utility classes for mobile breakpoints (`md:`, `sm:`) are likely missing or overridden by inline GSAP styles.
- **Affected Files:** `next_/app/(customer)/pre-configure/page.jsx`
- **Estimated Time to Fix:** 3 - 5 hours
- **Priority:** **HIGH**

### 3. Contrast Problems & Price Color Issues
- **Reason:** Dynamic styling relies on database fields (`bgColor`, `text_color`, `accentColor` in the `Product` model). If an admin enters a light background hex code without explicitly changing the text color to a dark hex code, the contrast fails accessibility standards. The frontend lacks a fallback or auto-contrast calculation (e.g., YIQ luminance).
- **Affected Files:** `next_/app/(customer)/products/page.jsx`, Admin Panel Product Form
- **Estimated Time to Fix:** 2 - 3 hours
- **Priority:** **HIGH**

### 4. Missing Images (Broken Links)
- **Reason:** The backend serves media statically from the local `/uploads` directory. If the CI/CD pipeline deploys to a new server, or if the database is restored without syncing the physical `uploads` folder, the database `filePath` strings point to non-existent files resulting in 404 errors.
- **Affected Files:** `nest_/src/main.ts`, `nest_/src/modules/media/*`
- **Estimated Time to Fix:** 8 - 10 hours (Requires migrating to AWS S3 / Cloud Storage)
- **Priority:** **CRITICAL**

### 5. Product Sorting Issues
- **Reason:** The `sortOrder` field exists in the database for `ProductMedia`, `VariantImage`, and `AttributeValue`, but the backend APIs are likely missing the `orderBy: { sortOrder: 'asc' }` clause in Prisma queries, causing items to appear in unpredictable insertion order.
- **Affected Files:** `nest_/src/modules/product/product.service.ts`
- **Estimated Time to Fix:** 1 - 2 hours
- **Priority:** **MEDIUM**

### 6. Responsive Layout Breakage on Discover Page
- **Reason:** The grid layout on the `/discover` page attempts to load unoptimized, full-resolution images for every product. On mobile networks, this causes massive layout shifts (CLS) and scrolling jank, breaking the Lenis smooth scroll calculation.
- **Affected Files:** `next_/app/(customer)/discover/page.jsx`
- **Estimated Time to Fix:** 4 - 6 hours (Requires implementing Next/Image)
- **Priority:** **HIGH**

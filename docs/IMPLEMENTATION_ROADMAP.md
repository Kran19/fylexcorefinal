# ENTERPRISE IMPLEMENTATION ROADMAP — FYLEX PREMIUM WATCHES

> **Document Type:** Execution Plan & Remediation Strategy (Updated with User Directives)
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection (100% Empirical)

---

## 1. Executive Summary

This roadmap categorizes all technical debt, security findings, broken logic, media deduplication requirements, and enterprise mandates into 4 prioritized execution phases: **Critical**, **High**, **Medium**, and **Low**.

---

## Phase 1: Critical Priorities (Immediate Security & System Hardening)

### Task 1.1: Add Authentication Guard to Media Uploads
- **User Directive:** "use authentication media" — all media uploads must be protected.
- **Reason:** Currently /api/media/upload accepts 200MB uploads without authentication. Enforce JwtAuthGuard so only logged-in admins can upload.
- **Affected Files:** 
est_/src/modules/media/media.controller.ts
- **Affected APIs:** POST /api/media/upload
- **Affected DB:** media
- **Risk Level:** **CRITICAL** (Unauthorized Storage Consumption)
- **Estimated Effort:** 2 Hours
- **Testing Plan:** Send unauthenticated POST request to /api/media/upload; verify 401 Unauthorized response.
- **Rollback Plan:** Remove @UseGuards(JwtAuthGuard) decorator.

### Task 1.2: Server Media Deduplication & Single Source of Truth
- **User Directive:** "every single media should come inside media & if duplicate then single source of truth so remove duplicate files on server"
- **Reason:** SHA256 audit revealed 3 identical 104MB MP4 video files (5ce4b2a5...mp4, 884d7106...mp4, acd4044...mp4) wasting 208MB of disk space.
- **Affected Files:** 
est_/uploads/, 
est_/src/modules/media/media.service.ts
- **Affected DB:** media, products, product_media
- **Risk Level:** **HIGH** (Storage Optimization & Data Integrity)
- **Estimated Effort:** 4 Hours
- **Remediation Steps:**
  1. Relink all DB entries referencing 884d7106...mp4 and acd4044...mp4 to canonical file 5ce4b2a5ef3e31b510f5d53923a23a46d.mp4.
  2. Safely delete the 2 duplicate MP4 files from disk (reclaiming 208.34 MB).
  3. Implement pre-upload hash check in media.service.ts to prevent future duplicate writes.
- **Testing Plan:** Upload an identical image/video file twice; verify server reuses existing file and returns canonical media ID.
- **Rollback Plan:** Restore deleted duplicate files from server backup.

### Task 1.3: WhatsApp OTP API Integration (Phase Out Temp '1234')
- **User Directive:** "1234 is for now cause we do not have whatsapp api yet so it's for base right now"
- **Reason:** Hardcoded OTP '1234' is currently an intentional temporary development base until WhatsApp OTP API is integrated.
- **Affected Files:** 
est_/src/modules/auth/auth.service.ts, 
est_/src/modules/auth/auth.controller.ts
- **Affected APIs:** POST /api/auth/login-otp
- **Affected DB:** customers
- **Risk Level:** **HIGH** (Post-Dev Launch Requirement)
- **Estimated Effort:** 6 Hours (when WhatsApp API keys available)
- **Testing Plan:** Verify real WhatsApp OTP generation, dispatch, and validation.
- **Rollback Plan:** Fallback to dev mode flag if WhatsApp provider API is unreachable.

---

## Phase 2: High Priorities (Pre-Launch Mandates)

### Task 2.1: Enforce Backend API Auth Guards
- **Reason:** Order status update, customer management, settings endpoints are missing JwtAuthGuard.
- **Affected Files:** 
est_/src/modules/order/order.controller.ts, 
est_/src/modules/system/system.controller.ts
- **Affected APIs:** All /api/orders/*, /api/system/* endpoints
- **Affected DB:** orders, settings
- **Risk Level:** **HIGH** (Unauthorized Access)
- **Estimated Effort:** 6 Hours
- **Testing Plan:** Send unauthenticated request to /api/orders/1/status; verify 401 Unauthorized response.
- **Rollback Plan:** Revert guards in controllers.

### Task 2.2: Enforce Invoice PDF Ownership Verification
- **Reason:** Invoice endpoint /orders/:id/invoice is unauthenticated and exposes customer PII.
- **Affected Files:** 
est_/src/modules/order/order.controller.ts, 
est_/src/modules/order/invoice.service.ts
- **Affected APIs:** GET /api/orders/:id/invoice
- **Affected DB:** orders, customers
- **Risk Level:** **HIGH** (PII Data Leak)
- **Estimated Effort:** 3 Hours
- **Testing Plan:** Request invoice PDF as Customer A for Customer B's order ID; verify 403 Forbidden.
- **Rollback Plan:** Revert ownership check logic in order.controller.ts.

---

## Phase 3: Medium Priorities (Quality & UI Alignment)

### Task 3.1: Standardize Storefront Currency Formatting to INR (₹)
- **Reason:** /admin/products/page.jsx formats prices using $ instead of Indian Rupee (₹).
- **Affected Files:** 
ext_/app/admin/products/page.jsx, 
ext_/lib/utils.js
- **Affected APIs:** N/A (UI Formatting)
- **Risk Level:** **MEDIUM** (Brand Consistency)
- **Estimated Effort:** 3 Hours
- **Testing Plan:** Inspect Product Catalog data table; verify all price strings display ₹.
- **Rollback Plan:** Revert formatting helper in page.jsx.

### Task 3.2: Integrate Interactive Help Drawer Component (AdminHelpDrawer.jsx)
- **Reason:** Admin panel requires self-documenting operational guidance across all 47 pages.
- **Affected Files:** 
ext_/components/admin/AdminHelpDrawer.jsx, 
ext_/components/admin/AdminLayout.jsx
- **Risk Level:** **MEDIUM** (Operational Efficiency)
- **Estimated Effort:** 10 Hours
- **Testing Plan:** Click floating ℹ️ button on /admin/dashboard, /admin/products, /admin/orders; verify drawer opens with accurate page metadata.
- **Rollback Plan:** Remove AdminHelpDrawer component from AdminLayout.jsx.

---

*Generated as Document 07 of 07 in Production Gap Series (Updated with User Directives)*

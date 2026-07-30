# UNNECESSARY FEATURES & ITEM DISPOSITION — FYLEX ENTERPRISE CMS

> **Document Type:** Production Feature Disposition & Code Cleanup Strategy
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection (100% Empirical)

---

## Executive Summary

This document evaluates every UI element, setting, component, API endpoint, and database column across the FYLEX Admin Panel. Items are classified into three strict categories:
1. **Must Keep:** Core operational capabilities essential for luxury watch e-commerce.
2. **Needs Review:** Elements that require bug fixes, security tightening, or UI alignment before production.
3. **Safe to Remove:** Dead code, unused components, orphan routes, and non-functional UI controls that bloat the application.

---

## Page-by-Page Element Classification Matrix

| Page / Component | Element | Classification | Technical Justification |
|---|---|---|---|
| **Dashboard** (/admin/dashboard) | Welcome Rocket Banner (as fa-rocket) | **Needs Review** | Informal rocket icon clashes with luxury brand aesthetic. Replace with refined brand greeting. |
| **Dashboard** (/admin/dashboard) | Category Order Toggle Button | **Needs Review** | Toggling button changes state but does not fetch or filter category chart data. Fix handler or remove button. |
| **Dashboard** (/admin/dashboard) | Daily/Monthly Trend Charts | **Must Keep** | Critical operational indicators for store sales velocity. |
| **Products** (/admin/products) | Client-Side Currency Formatting ($0.00) | **Needs Review** | Hardcoded USD formatting $0.00 in getDisplayData() instead of Indian Rupee (₹). Must update to ₹. |
| **Products** (/admin/products) | Tabulator Handle Drag Column | **Safe to Remove** | Row handle column present in table config, but backend API does not persist reordered product sequence. |
| **Product Wizard** (/admin/products/create) | Raw File Inputs for Variants | **Safe to Remove** | Inline <input type="file"> in step 4 duplicates media upload logic. Replace with MediaPickerModal.jsx. |
| **Product Wizard** (/admin/products/create) | Browser confirm() Dialog | **Needs Review** | Step 3 uses native confirm() modal for large variant generation. Replace with branded ConfirmModal. |
| **Product Edit** (/admin/products/edit/[id]) | LocalStorage Draft Saving (draft_edit_*) | **Needs Review** | Causes state sync conflicts if another admin updates product on server. Add timestamp expiration or remove local draft. |
| **Product Edit** (/admin/products/edit/[id]) | Wildcard postMessage Target Origin | **Needs Review** | Line 99 uses '*' target origin for iframe preview. Must restrict to window.location.origin for security. |
| **Media Library** (/admin/media) | Unauthenticated Upload Endpoint | **Needs Review** | /api/media/upload accepts 200MB uploads without auth check. Add JwtAuthGuard. |
| **Media Library** (/admin/media) | ideo-optimization Subroute | **Safe to Remove** | Page route exists (pp/admin/media/video-optimization), but no backend video transcoding pipeline exists in NestJS. |
| **Media Library** (/admin/media) | deleted-assets Orphan Route | **Needs Review** | Route exists on disk (pp/admin/media/deleted-assets), but is unlinked from main Media Library sidebar/toolbar. |
| **CMS Banners** (/admin/cms/banners) | Text Color Input Picker | **Must Keep** | Essential for ensuring banner headline readability over dynamic hero background images. |
| **CMS Pages** (/admin/pages) | Raw HTML Render without DOMPurify | **Needs Review** | Rich content stored as raw HTML rendered via dangerouslySetInnerHTML. Add DOMPurify sanitization. |
| **Settings / Design** (/admin/settings/design) | Legacy CSS Variable Injection | **Must Keep** | Alias mappings (--fyl-deep-blue, --fyl-gold) ensure backward compatibility with V1 storefront CSS. |
| **Settings** (/admin/settings) | Unused Feature Toggles (eature_toggles) | **Safe to Remove** | Database settings group eature_toggles contains legacy keys not consumed anywhere in frontend code. |
| **Care & Support** (/admin/care) | Empty Parent Index Route | **Safe to Remove** | Sidebar links to /admin/care, but folder lacks index page.jsx (only sub-routes /admin/faqs and /admin/care-steps exist). |
| **Login Settings** (/admin/login-settings) | Unlinked Security Settings Page | **Needs Review** | Page exists on disk, but has no sidebar navigation link. Add to Settings submenu or merge into General Settings. |

---

## Detailed Removal & Cleanup Plan

### 1. Safe to Remove (Immediate Cleanup Target)
- **pp/admin/media/video-optimization/page.jsx**: Delete orphan frontend page or disable route until a real FFMPEG/transcoding pipeline is added to NestJS backend.
- **Unused eature_toggles Settings**: Purge unused key-value pairs from settings DB table.
- **Tabulator Row Handle Column in /admin/products**: Remove column { rowHandle: true } since product reordering is handled via category/featured priority flags.

### 2. Needs Review (Remediation Required Before Launch)
- **Currency Symbol Standardization**: Audit all admin pages for hardcoded $ symbols and standardize on ₹ (INR).
- **Wildcard postMessage Security**: Replace all postMessage(..., '*') calls in DesignSettingsPage and EditProductPage with window.location.origin.
- **API Guard Attachment**: Enforce JwtAuthGuard on all admin endpoints in NestJS backend.

---

*Generated as Document 03 of 07 in Production Gap Analysis Series*

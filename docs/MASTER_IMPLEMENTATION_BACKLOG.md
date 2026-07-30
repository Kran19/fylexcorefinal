# Master Implementation Backlog — FYLEX Premium Watches

## Executive Overview
This document consolidates all audit findings into a single, prioritized Master Implementation Backlog for production execution.

---

## 1. Consolidated Master Backlog Items

| Issue ID | Module | Severity | Evidence Document | Evidence File & Line | Root Cause | Technical Impact | Risk | Dependencies |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **BACKLOG-01** | Media & Products | **High** | `MEDIA_MIGRATION_READINESS.md` | [`product.service.ts:L81`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L81) | Legacy products lack `ProductMedia` join entries | APIs fall back to raw string arrays | Medium | Database Data Sync Script |
| **BACKLOG-02** | Configurator | **High** | `MEDIA_API_MATRIX.md` | [`product.service.ts:L710`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L710) | Attribute options lack `VariantImage` bindings | Watch configurator renders PNG overlays | High | BACKLOG-01 |
| **BACKLOG-03** | Discover Page | **Medium** | `MEDIA_PAGE_MATRIX.md` | [`discover/page.jsx:L9`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/discover/page.jsx#L9) | Uses scalar string column `product.discoverHeroBgImage` | Hero banner serves uncompressed PNG | Low | CMS FK Alignment |
| **BACKLOG-04** | CMS & Settings | **Medium** | `ADMIN_MEDIA_AUDIT.md` | [`settings/page.jsx:L154`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/settings/page.jsx#L154) | Settings table stores raw upload paths in `value` | CMS banners fail to return WebP variants | Medium | Schema FK Migration |
| **BACKLOG-05** | Production Server | **Medium** | `MEDIA_NETWORK_TRACE.md` | [`main.ts:L20`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/main.ts#L20) | Static interceptor middleware requires PM2 reload | Raw GET requests return 4.18MB PNG | Low | PM2 Process Reload |

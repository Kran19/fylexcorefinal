# Dependency-Aware Implementation Sequence — FYLEX

## Executive Overview
This document defines the exact, non-blocking execution order for production deployment.

---

## 1. Sequence Execution Roadmap

| Step Number | Module | Primary Action | Blocks Which Modules | Estimated Risk | Rollback Difficulty |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **Step 1** | **Database Data Sync** | Run script to populate `ProductMedia` for legacy products | Step 2, Step 3 | Very Low | Easy (Non-destructive) |
| **Step 2** | **NestJS DTO Contract** | Unify `/api/products` and `/api/media` response contracts | Step 3, Step 4 | Low | Easy (Revert NestJS service) |
| **Step 3** | **CMS Schema Alignment** | Add `mediaId` FKs to `Setting` and `Banner` entities | Step 4 | Low | Easy (Migration rollback) |
| **Step 4** | **End-to-End Testing** | Run 20-route 10-point visual and API regression suite | Step 5 | Low | N/A |
| **Step 5** | **PM2 Process Reload** | Restart NestJS process on VPS server to apply static interceptor | Step 6 | Very Low | Easy (`pm2 restart`) |
| **Step 6** | **Deprecate Fallback** | Remove legacy string array fallbacks after 100% verification | None | Low | Easy (Re-enable fallback) |

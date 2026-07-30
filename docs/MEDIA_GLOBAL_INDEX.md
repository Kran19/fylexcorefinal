# Global Project Media Architecture Index — FYLEX

## Executive Overview
This document indexes every module, controller, service, repository, component, and utility handling digital assets across the FYLEX Next.js frontend and NestJS backend repositories.

---

## 1. NestJS Backend Media Subsystems

| Subsystem / Module | File Path | Line Range | Purpose |
| :--- | :--- | :---: | :--- |
| **Media Service** | [`nest_/src/modules/media/media.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/media.service.ts#L1-L218) | L1-L218 | CRUD operations for raw uploads & asset catalog |
| **Media Controller** | [`nest_/src/modules/media/media.controller.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/media.controller.ts#L1-L150) | L1-L150 | Admin upload REST routes & file handling |
| **Optimization Service** | [`nest_/src/modules/media/optimization/media-optimization.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/optimization/media-optimization.service.ts#L1-L611) | L1-L611 | Sharp / FFmpeg compression, WebP/AVIF generation, purge cleaner |
| **Optimization Controller** | [`nest_/src/modules/media/optimization/media-optimization.controller.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/media/optimization/media-optimization.controller.ts#L1-L120) | L1-L120 | REST API endpoints for optimization center & purge actions |
| **Product Service** | [`nest_/src/modules/product/product.service.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/modules/product/product.service.ts#L70-L83) | L70-L83, L454, L710 | Product media binding & legacy JSON parsing |
| **Static Asset Middleware** | [`nest_/src/main.ts`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/src/main.ts#L20-L55) | L20-L55 | Express static asset hosting & WebP interceptor |

---

## 2. Next.js Frontend Media Subsystems

| Subsystem / Module | File Path | Line Range | Purpose |
| :--- | :--- | :---: | :--- |
| **Core Utility Helpers** | [`next_/lib/utils.js`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L9-L210) | L9-L210 | `getFileUrl()`, `resolveProductImage()`, `resolveProductBackground()`, `extractMediaPath()` |
| **Media Picker Modal** | [`next_/components/admin/MediaPickerModal.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/components/admin/MediaPickerModal.jsx#L90-L100) | L90-L100 | Central DAM selection modal for admin pages |
| **Admin Media Library** | [`next_/app/admin/media/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/media/page.jsx#L12-L460) | L12-L460 | File manager grid, filter, and upload UI |
| **Optimization Center** | [`next_/app/admin/media/optimization-center/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/media/optimization-center/page.jsx#L4-L834) | L4-L834 | DAM Health Score, side-by-side compare, batch optimization progress |
| **Storage Purge Center** | [`next_/app/admin/media/purge-cleanup/page.jsx`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/admin/media/purge-cleanup/page.jsx#L1-L300) | L1-L300 | Reclaim VPS disk space by purging master raw files |

---

## 3. Database Models & Schema Boundaries

| Model Name | Prisma File | Line Number | Foreign Keys & Relational Bindings |
| :--- | :--- | :---: | :--- |
| `Media` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L371) | L371-L416 | Primary asset registry (`filePath`, `serveMode`, `isOptimized`) |
| `MediaVariant` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L418) | L418-L437 | `mediaId` -> `Media.id` (`format`, `quality`, `filePath`, `fileSize`) |
| `ProductMedia` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L911) | L911-L925 | `productId` -> `Product.id`, `mediaId` -> `Media.id` (`type`) |
| `VariantImage` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L399) | L399 | `productVariantId` -> `ProductVariant.id`, `mediaId` -> `Media.id` |
| `Belt` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L400) | L400 | `beltImageId` -> `Media.id` |
| `Box` | [`nest_/prisma/schema.prisma`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/nest_/prisma/schema.prisma#L401) | L401 | `boxImageId` -> `Media.id` |

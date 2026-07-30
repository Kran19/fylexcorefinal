# Comprehensive REST API Media Endpoint Audit Matrix — FYLEX

## Executive Overview
This document audits every REST API route in NestJS backend controllers returning media assets, file URLs, or metadata payload structures.

---

## 1. NestJS Controller Endpoint Matrix

| Endpoint Route | HTTP Method | NestJS Controller | Service Method | Prisma Relations Loaded | Returned Payload Type | WebP Variant Support | Output URL Format | Used By Frontend Pages |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `GET /api/media` | `GET` | `MediaController` | `getAllMedia()` | `variants: true`, `_count` | Entity Array | ✅ Native WebP | `/uploads/optimized/webp/...` | `/admin/media` |
| `GET /api/media/:id` | `GET` | `MediaController` | `getMediaById()` | `variants: true` | Single Entity | ✅ Native WebP | `/uploads/optimized/webp/...` | Admin Modals |
| `POST /api/media/upload` | `POST` | `MediaController` | `saveUploadedFile()`| `Media.create` | Upload Result | ⚠️ Pending Optimization | `/uploads/[hash].png` | Media Picker |
| `POST /api/media/optimization/batch` | `POST` | `MediaOptimizationController` | `batchOptimize()` | `MediaVariant.create` | Progress DTO | ✅ Generates WebP | `/uploads/optimized/webp/...` | `/admin/media/optimization-center` |
| `GET /api/products` | `GET` | `ProductController` | `findAll()` | `productMedia.media` | Mixed (`productMedia` + `images` JSON) | ⚠️ Partial | `/api/uploads/...` | `/shop`, `/products`, `/` |
| `GET /api/products/configurable`| `GET` | `ProductController` | `findConfigurable()` | `variants.variantImages.media` | Mixed (`variantImages` + `images` JSON) | ⚠️ Partial | `/api/uploads/...` | `/configure` |
| `GET /api/products/:id` | `GET` | `ProductController` | `findOne()` | `productMedia.media`, `variantImages.media` | Full Entity | ✅ Native WebP | `/api/uploads/...` | `/products/[id]` |
| `GET /api/discover` | `GET` | `ProductController` | `getDiscoverProducts()` | None (Raw columns) | Raw String Array | ❌ Raw String | `/uploads/[hash].png` | `/discover` |
| `GET /api/categories` | `GET` | `CategoryController` | `findAll()` | `categoryImage` | Relational Entity | ✅ Native WebP | `/api/uploads/...` | `/shop` |
| `GET /api/brands` | `GET` | `BrandController` | `findAll()` | `brandLogo` | Relational Entity | ✅ Native WebP | `/api/uploads/...` | `/shop` |
| `GET /api/settings` | `GET` | `SettingController` | `findAll()` | None (Key-Value) | Raw String Pair | ❌ Raw String | `/uploads/[hash].png` | `/admin/settings`, Navbar, Footer |
| `GET /api/care-steps` | `GET` | `CareStepController` | `findAll()` | None (Raw columns) | Raw String Entity | ✅ Standardized Helper | `/api/uploads/...` | `/admin/care-steps` |

# Customer Frontend Page Media Audit Matrix — FYLEX

## Executive Overview
This document audits every customer-facing route, modal, gallery, hero section, and carousel in the FYLEX Next.js web application.

---

## 1. Customer Page Inventory & Media Architecture Audit

| Page Route | Media Element / Component | API Endpoint Called | Helper Function Used | Active Data Payload | Optimized WebP Served? | Audit Status | Code Reference |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **`/` (Home)** | Hero Video `<video>` | `GET /api/settings` | `getFileUrl()` | `videoSettings.home_hero_video` | ⚠️ Raw MP4 Stream | **Review** | [`page.tsx:L913`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/page.tsx#L913) |
| **`/` (Home)** | Watch Cards `<img>` | `GET /api/products` | `getDisplayData()` | `display.image` (ProductMedia) | ✅ Yes | **Pass** | [`page.tsx:L1019`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/page.tsx#L1019) |
| **`/shop`** | Catalog Grid `ProductCard` | `GET /api/products` | `resolveProductImage()` | `ProductMedia` / `images` | ⚠️ Mixed (50%) | **Review** | [`shop/page.jsx:L712`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/shop/page.jsx#L712) |
| **`/products`** | Gallery Zoom Slider | `GET /api/products` | `resolveProductImage()` | `ProductMedia` | ✅ Yes | **Pass** | [`products/page.jsx:L7`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/products/page.jsx#L7) |
| **`/discover`** | Discover Hero Canvas | `GET /api/discover` | `getFileUrl()` | `product.discoverHeroBgImage` | ❌ Raw PNG | **Fail** | [`discover/page.jsx:L9`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/discover/page.jsx#L9) |
| **`/configure`** | Watch Dial Overlay | `GET /api/products/configurable` | `resolveProductImage()` | `VariantImage` / `Media` | ✅ Yes | **Pass** | [`configure/page.jsx:L131`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/configure/page.jsx#L131) |
| **`/configure`** | Strap Option Overlay | `GET /api/products/configurable` | `getFileUrl()` | `vImg.media` / `vPath` | ⚠️ Mixed | **Review** | [`configure/page.jsx:L260`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/configure/page.jsx#L260) |
| **`/pre-configure`**| Box & Strap Selector | `GET /api/pre-configure` | `getFileUrl()` | `belt.image` / `box.image` | ⚠️ Mixed | **Review** | [`configure/page.jsx:L268`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/configure/page.jsx#L268) |
| **`/cart`** | Drawer Item Thumbnail | `GET /api/cart` | `resolveProductImage()` | `ProductMedia` | ✅ Yes | **Pass** | [`cart/page.jsx:L13`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/cart/page.jsx#L13) |
| **`/checkout`** | Order Summary Item | `GET /api/checkout` | `resolveProductImage()` | `ProductMedia` | ✅ Yes | **Pass** | [`checkout/page.jsx:L10`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/checkout/page.jsx#L10) |
| **`/profile`** | Wishlist / Order History| `GET /api/customer/profile`| `resolveProductImage()` | `ProductMedia` | ✅ Yes | **Pass** | [`profile/page.jsx:L187`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/profile/page.jsx#L187) |
| **`/about`** | Founder Story Video | `GET /api/settings` | `resolveProductImage()` | `founderVariant` | ⚠️ Mixed | **Review** | [`about/page.jsx:L415`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/app/(customer)/about/page.jsx#L415) |

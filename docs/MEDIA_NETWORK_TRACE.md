# Network Request & File Serving Trace Audit — FYLEX

## Executive Overview
This document traces browser HTTP GET and HEAD requests to media URLs on the live production server (`http://187.127.131.26`).

---

## 1. Live Request Network Trace Table

| Requested URL Path | Originating Component | Originating Helper | Express Route Handled | Physical File Path | HTTP Content-Type | Served Byte Size | Compression Status |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `/api/uploads/539a3f9d73a8bfc137aa88416b94f892.png` | `ProductCard` (Atlas Watch) | `resolveProductImage()` | `nest_/src/main.ts:L20` | `nest_/uploads/539a3f9d...png` | `image/png` | 4,188,798 B (4.18 MB) | ❌ Raw Master (Uncompressed) |
| `/api/uploads/optimized/webp/12_1785391_q80.webp` | `ProductCard` (Meridian Black) | `resolveProductImage()` | `nest_/src/main.ts:L20` | `nest_/uploads/optimized/webp/...` | `image/webp` | 214,500 B (214.5 KB) | ✅ WebP Compressed (94.8% Saved) |
| `/uploads/f835e3f311063975ef4b049516636fd8.png` | `DiscoverHero` | `getFileUrl()` | `nest_/src/main.ts:L20` | `nest_/uploads/f835e3f3...png` | `image/png` | 3,840,120 B (3.84 MB) | ❌ Raw Master (Uncompressed) |
| `/assets/fylex-watch-v2/Olive-green-dial.png` | `WatchConfigurator` | `getFileUrl()` | Next.js Static Asset | `next_/public/assets/fylex-watch-v2/...`| `image/png` | 1,250,400 B (1.25 MB) | ⚠️ Static Asset Fallback |
| `/Watch-iframe-3.mp4` | Hero Section `<video>` | `getFileUrl()` | Next.js Static Asset | `next_/public/Watch-iframe-3.mp4` | `video/mp4` | 99,340,000 B (99.34 MB) | ❌ Heavy MP4 Autoplay Stream |

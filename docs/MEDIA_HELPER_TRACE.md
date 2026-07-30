# Frontend Media Utility & Helper Trace Audit — FYLEX

## Executive Overview
This document audits every utility helper, media formatter, and URL resolution function in `next_/lib/utils.js`.

---

## 1. Core Helper Function Trace Matrix

| Helper Function | Code Location | Input Types Handled | Output URL Format | Fallback Logic Executed | Called By Pages & Components |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `getFileUrl(path)` | [`next_/lib/utils.js:L9`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L9) | `string` \| `object` | `/api/uploads/...` | Standardizes relative paths, handles `/assets/` static watch fallbacks | `shop`, `products`, `discover`, `configure`, `cart`, `checkout`, `admin` |
| `extractMediaPath(item)` | [`next_/lib/utils.js:L60`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L60) | `object` \| `string` | Relative path string | Resolves `item.bestVariant.filePath` or `item.primaryVariant.filePath` when `serveMode !== 'original'`; returns plain string as-is | `resolveProductImage`, `resolveProductBackground`, `getFileUrl` |
| `resolveProductImage(product, variant)` | [`next_/lib/utils.js:L157`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L157) | `Product` object, `Variant` object | Scaled Image URL | 1. Variant MAIN image ➔ 2. Product MAIN `productMedia` ➔ 3. First Variant MAIN ➔ 4. `product.images` JSON fallback ➔ 5. `product.heroImage` ➔ 6. `/assets/fylex-watch-v2/premium.png` | `ProductCard`, `CartItemRow`, `CheckoutSummary`, `WishlistCard`, `shop`, `configure` |
| `resolveProductBackground(product, variant)` | [`next_/lib/utils.js:L203`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L203) | `Product` object, `Variant` object | Background Image URL | 1. Variant `HERO_BG` ➔ 2. Product `HERO_BG` ➔ 3. `product.discoverHeroBgImage` ➔ 4. `null` | `shop`, `configure`, `explore`, `about` |
| `getDisplayData(product, variant)` | [`next_/lib/utils.js:L103`](file:///c:/Users/Admin/Desktop/projects/Fylex-final/next_/lib/utils.js#L103) | `Product` object, `Variant` object | Unified Display DTO (`name`, `price`, `image`, `heroBgImage`) | Normalizes price, subtitle formatting, image extraction across all components | `Homepage`, `WishlistContext`, `CartContext`, `OrderContext`, `shop` |

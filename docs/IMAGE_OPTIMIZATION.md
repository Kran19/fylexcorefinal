# Image Optimization Audit

## 1. Executive Summary
**Score:** 15/100 (Critical Failure)

The application completely bypasses Next.js's built-in image optimization capabilities. It relies heavily on standard HTML `<img>` tags, leading to severe performance bottlenecks, especially for an e-commerce platform that relies on high-quality watch imagery.

## 2. Issues Discovered

### 2.1 Next/Image Missing
A codebase-wide search confirms that `next/image` is **not used anywhere** in the `app/` or `components/` directories.
- Images are not being automatically resized for different device widths.
- Browsers are forced to download full-resolution images on mobile devices, consuming massive bandwidth.

### 2.2 Lack of Modern Formats (WebP/AVIF)
Because `next/image` is not used, images are served in their original uploaded formats (JPEG, PNG). There is no automatic conversion to Next-Gen formats like WebP or AVIF, which could reduce file sizes by 30-50% without quality loss.

### 2.3 Lazy Loading
Without `next/image` or explicit `loading="lazy"` attributes, images below the fold (e.g., in long carousels or lower down on the `/discover` page) are loaded immediately upon page initialization, delaying the `window.onload` event and increasing bandwidth costs.

### 2.4 Blur Placeholders (Cumulative Layout Shift)
There is no blur-up placeholder strategy in place. Images popping in late will cause significant Cumulative Layout Shift (CLS), moving content around and providing a jarring user experience.

### 2.5 CDN & Caching
While images are hosted (likely from the backend server `187.127.131.26`), they do not appear to be routed through a dedicated Image CDN (like Cloudinary, Imgix, or Vercel Edge Cache) for edge delivery.

## 3. Recommended Fixes (Phase 1)
1. **Refactor `<img src="...">` to `<Image src="...">`:** Import `next/image` in all components (especially `ProductCard`, `Carousel`, and Hero sections).
2. **Configure Remote Patterns:** Add the backend IP/Domain to `next.config.ts` under `images.remotePatterns` to allow Next.js to optimize external images.
3. **Implement Priority:** Add `priority={true}` to hero images on the homepage and LCP (Largest Contentful Paint) images on product pages.
4. **Implement Sizes:** Define `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"` for grid images to ensure mobile devices download smaller files.

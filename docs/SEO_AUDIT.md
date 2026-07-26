# SEO Audit

## 1. Executive Summary
**Score:** 20/100 (Poor)

Despite being an e-commerce platform selling premium products, the application is fundamentally hostile to Search Engine Optimization. The architectural choice to rely on client-side rendering for routing destroys indexability.

## 2. Technical SEO Flaws

### 2.1 Dynamic Metadata Missing
A search across the `app/` directory reveals that Next.js `generateMetadata` is **never used**.
- **Product Pages:** The `/products` route relies on client-side state/query parameters to fetch and display the product. Search engine crawlers (like Googlebot) will not execute all client-side requests perfectly and will index an empty shell or a generic title for all products instead of specific "Fylex Watch Model X" titles.
- **OpenGraph & Twitter Cards:** Without dynamic metadata, social sharing links for specific products will fallback to a generic homepage card, destroying click-through rates from social media.

### 2.2 Canonical URLs
Since all products technically live on the same physical route (e.g., `/products?id=123`), canonicalization is severely broken. There is a high risk of duplicate content penalties or canonical mismatch if query parameters are reordered or omitted.

### 2.3 URL Structure
The URL structure is not SEO-friendly.
- **Current:** `/products?id=123`
- **Ideal:** `/products/men-watch-collection/fylex-model-x`
There are no `[slug]` folders in the Next.js `app/` directory to support clean URL routing.

## 3. On-Page & Schema Deficiencies

### 3.1 Structured Data (JSON-LD)
There is no indication of dynamic JSON-LD injection for:
- `Product` schema (Price, Availability, Reviews)
- `BreadcrumbList` schema
- `FAQPage` schema
Without this, FYLEX products will not appear with Rich Snippets (stars, price, in-stock badges) in Google search results.

### 3.2 Sitemap & Robots.txt
Because product URLs are dynamic and handled client-side, generating a standard `sitemap.xml` automatically via Next.js is impossible without significant refactoring to fetch the product catalog statically or dynamically at the server level.

## 4. Recommendations
1. **Implement Dynamic Routing:** Move `/products/page.jsx` to `/products/[slug]/page.jsx`.
2. **Server-Side Data Fetching:** Fetch product data in Server Components so the HTML is fully hydrated when sent to the crawler.
3. **Add `generateMetadata`:** Implement dynamic metadata for title, description, and OpenGraph images on all product, category, and discover pages.
4. **Implement JSON-LD:** Output `application/ld+json` blocks containing valid Product schema on every product page.

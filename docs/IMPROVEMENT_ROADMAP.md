# Improvement Roadmap

## Phase 1: Critical Fixes (Immediate Action)
These tasks resolve broken features and critical performance bottlenecks.
1. **Implement `next/image`:** Replace all standard `<img>` tags on the frontend to drastically reduce LCP and TBT.
2. **Fix Variant Image Logic:** Debug the `/configure` route and backend API to ensure that selecting a Dial/Bracelet properly loads the corresponding variant gallery instead of falling back to default or blank states.
3. **Secure API CORS:** Update `main.ts` to restrict API access to the production frontend domain only.
4. **Fix UI Overlaps:** Resolve Z-index and absolute positioning conflicts on the mobile `/pre-configure` layout.

## Phase 2: Architecture & SEO Refactoring
These tasks transition the platform from a client-rendered SPA to a true Next.js Server-Rendered application.
1. **Dynamic Routing:** Refactor `/products/page.jsx` to `/products/[slug]/page.jsx`.
2. **Server Components & Metadata:** Fetch product data server-side and implement `generateMetadata` for dynamic SEO titles, descriptions, and OpenGraph images.
3. **Component Splitting:** Break down the monolithic 80KB `page.jsx` files into modular, reusable React components (`ProductCard`, `Carousel`, `Hero`).
4. **Structured Data:** Inject JSON-LD schema on product pages for rich snippets.

## Phase 3: Admin & Media Improvements
1. **Cloud Storage Migration:** Migrate the `media` table and upload service from local disk (`/uploads`) to AWS S3.
2. **Bulk Image Mapper:** Create an admin tool to bulk upload variant images and map them to SKUs based on filename conventions.
3. **Visual Variant Builder:** Enhance the Admin UI to show a matrix of available Dial/Bracelet combinations and flag missing SKUs or images.

## Phase 4: Performance & Scaling
1. **Containerization:** Create Dockerfiles and a `docker-compose.yml` to standardize the environment across development, testing, and production.
2. **Rate Limiting:** Protect the NestJS backend with `@nestjs/throttler`.
3. **Caching Strategy:** Implement Redis caching on the backend for heavy queries (like the product catalog and offers).

## Phase 5: Future Features
1. **Advanced Analytics:** Build an admin dashboard for sales metrics, abandoned carts, and popular variant combinations.
2. **Automated Testing:** Implement a testing suite (Jest for Backend, Cypress/Playwright for Frontend flows).
3. **Zero-Downtime CI/CD:** Update the GitHub Actions workflow to support graceful blue/green deployments instead of hard PM2 restarts.

# Frontend Flow & Analysis

## 1. Tech Stack & Architecture
- **Framework:** Next.js (Version 16.2.1)
- **Router:** App Router (`app/` directory)
- **UI Library:** React (19.2.4)
- **Styling:** Tailwind CSS (`@tailwindcss/postcss`), `clsx`, `tailwind-merge`
- **Animations:** GSAP (`@gsap/react`), Lenis (smooth scrolling)
- **State Management / Data Fetching:** Axios, React Hooks (local state), Context API (`context/` folder)

## 2. Directory Structure & Route Mapping
The application uses Next.js Route Groups (`(customer)`) to logically group the customer-facing views separate from the `admin` views.

### 2.1 Customer Routes (`app/(customer)/`)
- `/` (Home): Heavy landing page with GSAP animations.
- `/discover`: Showcases watch collections.
- `/products`: Product listing and detail views.
- `/pre-configure`: Interactive watch configuration flow.
- `/configure`: Post-selection watch customizer.
- `/cart` & `/checkout`: E-commerce transaction flow.
- `/login`, `/signup`, `/forgot-password`, `/reset-password`: Authentication.
- `/profile`, `/my-purchases`, `/wishlist`: User account management.
- `/policies`, `/care-support`: Static information.

### 2.2 Admin Routes (`app/admin/`)
- Admin dashboard built with `chart.js` and `tabulator-tables` for data management (products, variants, orders, offers, etc.).

## 3. Structural Flaws & Code Quality Issues
During the analysis, a major structural flaw was discovered: **Monolithic Page Components**.
- `app/page.tsx` is over 50KB.
- `app/(customer)/discover/page.jsx` is over 80KB.
- `app/(customer)/products/page.jsx` is nearly 40KB.

**Why this is a problem:**
1. **Lack of Componentization:** Instead of breaking the UI into reusable components (e.g., `ProductCard`, `HeroSection`, `WatchCustomizer`), entire pages are coded in single files.
2. **Dynamic Routing Missing:** There are no `[slug]` or `[id]` dynamic route folders (e.g., `app/products/[slug]/page.jsx`). The application relies entirely on URL search params (e.g., `?id=123`) read on the client side, or it performs monolithic client-side rendering for routing.
3. **Server/Client Component Mixup:** With files this large containing GSAP animations, the entire page is likely forced to be a `"use client"` component. This completely defeats the purpose of the Next.js App Router and Server Components, destroying SEO and increasing the JS bundle size.

## 4. Component Flow 
Since pages are monolithic, the conceptual flow is as follows:
- **Discover Flow:** User lands on `/discover`. Client-side fetches collections via Axios. User clicks a watch, Next.js routes to `/products?id=...` (or similar query pattern).
- **Configuration Flow:** User enters `/pre-configure` -> selects base watch -> enters `/configure` to swap bracelets/dials (client-side state).
- **Checkout Flow:** Configured item added to local state / Context -> Syncs with Backend API -> proceeds to `/checkout` -> Payment Gateway.

## 5. Metadata & SEO Setup
- The lack of dynamic server routes (`[slug]`) implies that dynamic SEO metadata (using Next.js `generateMetadata`) for individual products is likely **missing or broken**. If product pages rely on client-side fetching with search params, search engine crawlers will only see an empty shell.

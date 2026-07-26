# Backend Flow & Analysis

## 1. Tech Stack & Architecture
- **Framework:** NestJS (Express under the hood).
- **Language:** TypeScript.
- **Architecture Pattern:** Modular Monolith.
- **ORM:** Prisma Client.
- **API Prefix:** `/api`

## 2. Module Structure
The backend is exceptionally well-structured into domain-driven modules inside `src/modules/`:
- `auth`: Handles JWT issuance, customer/admin login.
- `product`: Manages products, variants, specifications.
- `customer`: Customer profile, addresses, loyalties.
- `order`: Checkout flow, shipments, returns.
- `payment`: Gateway integrations (Razorpay assumed from repo scripts).
- `cart`: Session/user-based cart management.
- `category` & `tag`: Taxonomy.
- `media`: File uploads and attachments.
- `marketing`: Offers, banners, promotions, popups.
- `cms`: Static pages and home sections.
- `wishlist`, `feedback` (reviews), `reports`, `system` (settings).

## 3. Global Setup
- **Validation:** Utilizes NestJS `ValidationPipe` globally with `whitelist: true` and `forbidNonWhitelisted: true` to prevent payload injection attacks.
- **Interceptors:** A global `ResponseInterceptor` normalizes API responses into a predictable format (e.g., `{ success: true, data: ... }`).
- **Swagger:** API documentation is auto-generated via `@nestjs/swagger` and available at `/api/docs`.

## 4. Media & Uploads Flow
- The application serves static assets directly via Express (`app.useStaticAssets`) at the `/uploads/` prefix.
- Uploads are saved to the physical `uploads/` directory on the server, as evidenced by `process.cwd()/uploads`.
- This explains why there are `check_media.sql` and image check scripts in the root directory: keeping physical files in sync with the `media` database table is challenging.

## 5. Security Context
- Implements Bearer Auth (JWT) as registered in Swagger (`addBearerAuth()`).
- The `auth` module separates `Admin` and `Customer` guard logic, likely through roles or decorators.
- CORS is enabled globally, reflecting the origin (`origin: true`) which allows any frontend to hit the API if credentials are provided. This should ideally be restricted to the production Next.js domain.

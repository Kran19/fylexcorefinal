# API Documentation Overview

*Note: Since the backend generates a live Swagger UI, this document serves as a high-level map of the API architecture.*

## 1. Accessing Live Documentation
The detailed interactive API documentation is available at:
**Endpoint:** `GET /api/docs`
**Engine:** Swagger UI (`@nestjs/swagger`)

## 2. API Design & Conventions
- **Base URL:** `/api`
- **Format:** JSON
- **Authentication:** Bearer Token (JWT). Send via header `Authorization: Bearer <token>`.
- **Standard Response Interceptor Format:**
  ```json
  {
    "statusCode": 200,
    "message": "Operation successful",
    "data": { ... }
  }
  ```

## 3. Core Resource Endpoints (Inferred)

### Auth (`/api/auth`)
- `POST /login` - Customer authentication
- `POST /admin/login` - Admin authentication
- `POST /register` - Customer registration

### Products (`/api/product` / `/api/products`)
- `GET /` - List products (likely paginated, filterable)
- `GET /:slug` or `/:id` - Product details including variants
- `GET /variants` - Fetch specific variant configurations

### Cart (`/api/cart`)
- `GET /` - Fetch active cart
- `POST /items` - Add variant to cart
- `PATCH /items/:id` - Update quantity
- `DELETE /items/:id` - Remove item

### Orders (`/api/order`)
- `POST /checkout` - Create order
- `GET /` - List customer orders
- `GET /:id` - Order status and history

### Media (`/api/media`)
- `POST /upload` - Upload images/banners (Admin only)
- *Media is served statically via `/uploads/filename.ext`*

## 4. Required Headers
- `Content-Type: application/json` (for all mutations)
- `Authorization: Bearer ...` (for protected routes)

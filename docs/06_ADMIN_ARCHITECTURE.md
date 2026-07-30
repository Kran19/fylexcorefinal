# 06 — ADMIN PANEL ARCHITECTURE

## Overview
The admin panel is built as a section of the Next.js App Router application under /admin/*.
It uses the same Next.js frontend but with AdminLayout, AdminSidebar, and admin-specific
API calls via services/adminApi.js.

No dedicated admin framework — all admin UI is custom-built in React.

---

## Admin Layout

### app/admin/layout.tsx (Minimal)
  Just renders {children} — all UI chrome managed per-page via AdminLayout component

### components/admin/AdminLayout.jsx
  Wraps pages in:
    AdminSidebar (navigation)
    AdminHeader (top bar)
    Main content area

### components/admin/Sidebar.jsx (9.9KB)
  Full navigation sidebar with:
    Logo/brand
    Navigation sections with icons
    Active state highlighting
    Sub-navigation items
  Routes exposed in sidebar (inspected from file):
    Dashboard, Products, Variants, Categories, Brands, Tags, Attributes, Specifications
    Orders, Customers/Users
    Media Library
    Offers, Gift Cards, Promotions
    CMS (Banners, Pages, Testimonials, Home Sections, Community)
    FAQs, Care Steps, Policies
    Reviews, Feedback
    Reports (Revenue, Orders, Inventory, Financial, Traffic)
    Settings (General, Design, Payments, Staff)
    Taxes, Shipping
    Belts, Boxes
    Notifications
    Inventory Management

### components/admin/Header.jsx (7.2KB)
  Admin header with:
    Page title
    Admin user info
    Logout button

---

## Admin Pages and Their Routes

### /admin/login
Purpose: Admin authentication
API: POST /auth/admin/login
Storage: saves admin_token to localStorage

### /admin/dashboard
Purpose: Business overview dashboard
API: GET /dashboard, GET /reports/dashboard
Shows: Total orders, revenue, customers, products, recent orders

### /admin/products
Purpose: Product listing
API: GET /products
Components: DataTable, TableToolbar, PaginationFooter

### /admin/products/create
Purpose: Create new product
Component: Multi-step wizard (ProductWizard.jsx 22KB)
API: POST /products

### /admin/products/edit
Purpose: Edit product
API: GET /products/:id, PUT /products/:id

### /admin/products/variants
Purpose: Manage variants
API: GET /variants, PATCH /variants/:id, POST /products/:id/generate-variants

### /admin/products/attributes
Purpose: Attribute management
API: GET/POST/PUT/DELETE /attributes, /attributes/:id/values

### /admin/products/specifications
Purpose: Specification management
API: GET/POST/PUT/DELETE /specifications, /specifications/groups, /specifications/values

### /admin/products/tags
Purpose: Tag management
API: GET/POST/PUT/DELETE /tags

### /admin/categories
Purpose: Category management
API: GET/POST/PUT/DELETE /categories

### /admin/orders
Purpose: Order management
API: GET /orders, PUT /orders/:id/status, PUT /orders/:id/payment-status
Shows: Order number, customer, status, total, date
Actions: View details, update status, update payment status

### /admin/users
Purpose: Customer management
API: GET /users, PUT /users/:id, DELETE /users/:id

### /admin/media
Purpose: Media library with folder navigation
API: GET /media, POST /media/upload, PUT /media/:id, DELETE /media/:id
Component: MediaPickerModal.jsx (for picking media in other pages)
Features: Upload, rename folders, delete, edit metadata

### /admin/offers
Purpose: Discount/coupon management
API: GET/POST/PUT/DELETE /marketing/offers, GET /marketing/offers/analytics

### /admin/belts
Purpose: Watch strap management
API: GET/POST/PUT/DELETE /belts

### /admin/boxes
Purpose: Watch box management
API: GET/POST/PUT/DELETE /boxes

### /admin/cms
Purpose: CMS home section management
API: GET/POST/PUT/DELETE /cms/home-sections

### /admin/pages
Purpose: Static CMS pages
API: GET/POST/PUT/DELETE /cms/pages

### /admin/testimonials
Purpose: Customer testimonials
API: GET/POST/PUT/DELETE /cms/testimonials

### /admin/community
Purpose: Community/Atelier gallery images
API: GET/POST/PUT/DELETE /cms/community-images

### /admin/faqs
Purpose: FAQ management
API: GET/POST/PUT/DELETE /faq

### /admin/care-steps
Purpose: Watch care guide steps per product
API: GET/POST/PUT/DELETE /product-care

### /admin/reviews
Purpose: Review moderation
API: GET /reviews, PATCH /reviews/:id/status, DELETE /reviews/:id

### /admin/reports
Purpose: Analytics and reporting
API: GET /reports/dashboard, /revenue, /orders, /inventory, /financial, /traffic, /variant-performance
Charts: Chart.js line/bar charts

### /admin/inventory
Purpose: Stock management
API: GET /products/inventory, PATCH /products/inventory/:id

### /admin/taxes
Purpose: Tax rate and class management
API: GET/POST/PUT/DELETE /system/taxes, /system/taxes/classes

### /admin/shipping
Purpose: Shipping methods
API: GET/POST/PUT/DELETE /system/shipping-methods

### /admin/notifications
Purpose: Notification management
API: (notification endpoints)

### /admin/settings
Purpose: General settings (25KB page)
API: GET /system/settings, POST /system/settings
Groups: general, contact, smtp, social, seo, payment, shipping, tax, currency, feature_toggles

### /admin/settings/design
Purpose: Design system editor + live preview
API: GET /system/settings, POST /system/settings
Key Feature: Embeds storefront in an <iframe>
  - Admin edits color pickers, border radius settings
  - Changes sent in real-time via postMessage to iframe
  - iframe (storefront) reads message via DesignSystemContext
  - Save: POST /system/settings with _group: 'design_system'
Preview URL default: /discover?watch=6

### /admin/settings/payments
Purpose: Payment gateway settings

### /admin/settings/staff
Purpose: Staff/admin user management

---

## Admin Components

### ProductWizard.jsx (22KB)
Multi-step product creation wizard:
  Step 1: Basic Info (name, SKU, slug, description, tagline, subtitle)
  Step 2: Pricing (price, selling price, special price, etc.)
  Step 3: Categories & Tags
  Step 4: Media (primary image, gallery images, technical images, video)
  Step 5: Attributes & Variants (generate variant combinations)
  Step 6: Specifications (technical specs)
  Step 7: Belts & Boxes (compatible straps and packaging)
  Step 8: Theme (per-product color overrides)
  Step 9: SEO (meta title, description, keywords)
API used: POST /products, POST /products/:id/generate-variants, POST /media/upload

### MediaPickerModal.jsx (7KB)
Reusable media picker for selecting images from the media library:
  - Fetches GET /media
  - Displays grid of images
  - Supports single or multi-select
  - Used in: ProductWizard, BannerEdit, TestimonialEdit, SettingsPage

### DataTable.jsx (6.4KB)
Generic admin data table:
  - Columns configuration prop
  - Sorting, filtering
  - Checkbox selection for bulk actions
  - Pagination integration

### TableToolbar.jsx (6KB)
Search bar, filter buttons, date range picker, export menu

### PaginationFooter.jsx (5.5KB)
Previous/next, page size selector, total count display

### BulkActionBar.jsx (2.3KB)
Shown when rows selected: bulk delete, bulk export, etc.

### StatusBadge.jsx (2.7KB)
Coloured badges for order status (pending=yellow, confirmed=blue, shipped=purple, etc.)

### FormField.jsx (4.6KB)
Standardised form input:
  - Supports: text, textarea, select, color, checkbox, file
  - Shows label, required indicator, help text, error message

### Loader.jsx (2KB)
Full-screen or inline loading spinner

### ErrorBanner.jsx (2.5KB)
Red error banner with icon and retry button

### ConfirmModal.jsx (2.9KB)
Delete confirmation dialog: "Are you sure? This action cannot be undone."

### PageHeader.jsx (1.9KB)
Page title + action button (e.g., "Create Product") header

### AdminModal.jsx (1.7KB)
Generic overlay modal wrapper

---

## Admin Auth Flow

1. Admin visits /admin/login
2. Submits credentials via adminApi.adminLogin()
3. POST /auth/admin/login
4. Server validates against admins table (role check)
5. Returns access_token
6. Stored in localStorage('admin_token')
7. All subsequent admin API calls include: Authorization: Bearer <admin_token>
8. No session persistence check on page load detected (no /auth/me call for admin)
9. Logout: adminLogout() — clears admin_token from localStorage

---

## Admin Permissions

CURRENT STATE: No RBAC (Role-Based Access Control) implemented in admin UI.
- All admin routes are accessible to any logged-in admin
- No role differentiation (super_admin vs admin) in admin panel code
- Backend admins table has a 'role' column (default: 'admin') but no enforcement found
- Invoice auth guard is commented out in order controller
- Risk: Any admin can access all data including orders, customers, payments

---

## Media Library Architecture

Storage: ./uploads/ (NestJS working directory)
URL: Served at /uploads/ and /api/uploads/ via Express static middleware
Format: Random 32-char hex filename + original extension
No subfolders by default (single flat directory)
folderPath field in media table allows virtual folder organisation
75 files currently: mostly PNG product images (4-12MB each), 3 MP4 videos (~104MB each)

---

*Document 06 of 20 — FYLEX Enterprise Documentation Suite*

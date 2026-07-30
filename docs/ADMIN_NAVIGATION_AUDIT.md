# ADMIN NAVIGATION & PANEL INVENTORY — FYLEX ENTERPRISE CMS

> **Document Type:** Production Readiness Audit & Complete Admin Inventory
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection (100% Empirical)

---

## 1. Sidebar Navigation Menus & Submenus

| Menu Key | Title | Icon | Main Path | Submenus (Titles & Paths) |
|---|---|---|---|---|
| dashboard | Dashboard | as fa-home | /admin/dashboard | *None* |
| eports | Reports | as fa-chart-line | /admin/reports | *None* |
| products | Products | as fa-cube | /admin/products | • All Products (/admin/products)<br>• Add Product (/admin/products/create)<br>• Variants (/admin/products/variants)<br>• Attributes (/admin/products/attributes)<br>• Specifications (/admin/products/specifications)<br>• Tags (/admin/products/tags)<br>• Belts (/admin/belts)<br>• Boxes (/admin/boxes) |
| categories | Categories | as fa-tags | /admin/categories | • All Categories (/admin/categories)<br>• Add New (/admin/categories?new=true) |
| 	axes | Taxes | as fa-percent | /admin/taxes | *None* |
| orders | Orders | as fa-shopping-cart | /admin/orders | *None* |
| offers | Offers | as fa-percentage | /admin/offers | • All Offers (/admin/offers)<br>• Add New (/admin/offers/create) |
| users | Customers | as fa-users | /admin/users | *None* |
| speed-booster | Speed Booster | as fa-bolt | /admin/media/optimization-center | • Media Library (/admin/media)<br>• Optimization Center (/admin/media/optimization-center) |
| cms | Dynamic Pages (CMS) | as fa-pager | /admin/cms | • Home Page Layout (/admin/cms/home-sections)<br>• About Page (/admin/cms/about)<br>• Sliders (/admin/cms/banners)<br>• Design System (/admin/settings/design) |
| community | Community | as fa-camera-retro | /admin/community | *None* |
| care | Care & Support | as fa-life-ring | /admin/care | • FAQs (/admin/faqs)<br>• Watch Care Steps (/admin/care-steps) |
| shipping | Shipping | as fa-truck | /admin/shipping | *None* |
| settings | Settings | as fa-cog | /admin/settings | *None* |

---

## 2. Complete Inventory of Admin Pages (47 Physical Routes)

### Core Management Pages
1. /admin/dashboard — Main Analytics & Operations Overview
2. /admin/reports — Advanced Business Reports (Revenue, Inventory, Financial, Traffic)
3. /admin/orders — Order Management Listing
4. /admin/orders/[id] — Order Detail & Status/Invoice Management Page
5. /admin/users — Customer Management Page

### Product & Catalogue Management
6. /admin/products — Product Catalog Listing Page
7. /admin/products/create — Multi-Step Product Creation Wizard (ProductWizard.jsx)
8. /admin/products/edit/[id] — Product Edit Page
9. /admin/products/variants — Global Product Variant Inventory & Status Management
10. /admin/products/attributes — Product Attributes & Values Management Page
11. /admin/products/specifications — Specifications & Spec Groups Management Page
12. /admin/products/tags — Product Tags Management Page
13. /admin/belts — Watch Straps (Belts) Catalogue & Add-On Management Page
14. /admin/boxes — Watch Packaging Boxes Catalogue & Management Page
15. /admin/inventory — Stock & Inventory Management Overview Page

### Categories
16. /admin/categories — Category Listing & Management Page
17. /admin/categories/create — Add Category Dedicated Page
18. /admin/categories/edit/[id] — Edit Category Page

### Offers & Marketing
19. /admin/offers — Discount Offers & Coupon Listing Page
20. /admin/offers/create — Add New Offer / Coupon Page

### CMS & Dynamic Content
21. /admin/cms — CMS Home Section Overview
22. /admin/cms/home-sections — Dynamic Home Page Sections Manager
23. /admin/cms/about — Dynamic About Page Content Manager
24. /admin/cms/banners — Sliders & Hero Banner Manager Page
25. /admin/pages — CMS Static Pages Listing & Editor
26. /admin/testimonials — Customer Testimonials Management Page
27. /admin/community — Atelier Chronicles Community Gallery Page
28. /admin/faqs — FAQ Knowledge Base Management Page
29. /admin/care-steps — Watch Care & Maintenance Steps Manager Page
30. /admin/reviews — Product Review Moderation & Rating Approval Page

### Media & Speed Booster (Optimization Hub)
31. /admin/media — Main Media Library Browser & Uploader
32. /admin/media/optimization-center — Image & Asset Speed Booster Optimization Hub
33. /admin/media/image-optimization — Image Compression & Format Converter Tool Page
34. /admin/media/video-optimization — Video Compression Hub Page
35. /admin/media/optimization-history — Sharp Media Optimization Audit Logs Page
36. /admin/media/storage-analytics — Media Disk & Folder Analytics Dashboard
37. /admin/media/deleted-assets — Soft-Deleted Media Trash Bin Page

### Settings & Configuration
38. /admin/settings — Primary System Settings (General, SMTP, SEO, Contact, Toggles)
39. /admin/settings/design — Design System Editor + Real-Time Storefront iFrame Live Preview
40. /admin/settings/payments — Payment Gateway (Razorpay/COD) Configuration Page
41. /admin/settings/staff — Admin Staff & Team Accounts Management Page
42. /admin/login-settings — Login Customisation & Credentials Security Page
43. /admin/taxes — Tax Classes & Tax Rates Management Page
44. /admin/shipping — Shipping Methods & Zone Rates Management Page

### System & Utility Pages
45. /admin/notifications — Notification Logs & Template Dispatcher Page
46. /admin/help — Admin Help Center & In-App Guide Page
47. /admin/login — Admin Authentication / Portal Login Page

---

## 3. Hidden & Unlisted Pages / Routes

The following pages exist in the file system or sidebar links, but are unlinked or orphan routes:

1. /admin/cms/about — Linked in Sidebar under CMS, but content relies on hardcoded sections.
2. /admin/help — Exists on disk, but has no floating widget or quick access link on pages.
3. /admin/login-settings — Route exists on disk (/admin/login-settings/page.jsx), but is missing from main Settings sub-navigation.
4. /admin/media/deleted-assets — Trash bin route exists on disk, but not linked from main Media Library UI.
5. /admin/media/storage-analytics — Analytics subroute exists on disk, not accessible via main sidebar.
6. /admin/media/video-optimization — Exists on disk, but has no actual video processing engine wired on backend.
7. /admin/care — Parent path defined in Sidebar (/admin/care), but has no index page.jsx (only sub-routes /admin/faqs and /admin/care-steps).

---

## 4. Popups & Modals Inventory

| Modal / Popup Component | Location | Trigger Site / Parent Page | Purpose |
|---|---|---|---|
| MediaPickerModal.jsx | components/admin/MediaPickerModal.jsx | Product Creation, Product Edit, Banners, Boxes, Belts | Media library asset selector popup |
| AdminModal.jsx | components/admin/AdminModal.jsx | Categories, Tags, Attributes, Belts, Boxes | Reusable form overlay modal wrapper |
| ConfirmModal.jsx | components/admin/ui/ConfirmModal.jsx | All Admin Listing Tables | Delete confirmation dialog ("Are you sure?") |
| Quick Create Modal | pp/admin/categories/page.jsx | Category Page | Inline quick creation modal |
| Attribute Value Modal | pp/admin/products/attributes/page.jsx | Attributes Page | Add/Edit attribute values modal |
| Specification Value Modal | pp/admin/products/specifications/page.jsx | Specifications Page | Add/Edit specification values modal |
| Variant Edit Modal | pp/admin/products/variants/page.jsx | Variants Page | Edit variant price/stock modal |
| Optimization Process Modal | pp/admin/media/optimization-center/page.jsx | Speed Booster | Asset compression preset selection modal |

---

## 5. API & Database Matrix Attached to Admin

| Admin Section | Attached API Endpoints (services/adminApi.js) | Attached Database Tables (schema.prisma) |
|---|---|---|
| **Dashboard** | GET /dashboard, GET /reports/dashboard | orders, customers, products, product_variants |
| **Reports** | GET /reports/revenue, /orders, /inventory, /financial, /traffic, /variant-performance | orders, order_items, product_variants, isitors, payments |
| **Products** | GET,POST,PUT,DELETE /products, POST /products/:id/generate-variants, POST /products/:id/media/360 | products, product_variants, ariant_attributes, product_media, product_belts, product_boxes |
| **Variants** | GET /variants, PATCH /variants/:id, POST /variants/:id/media | product_variants, ariant_attributes, ariant_images, media |
| **Categories** | GET,POST,PUT,DELETE /categories | categories, category_product, category_attributes |
| **Attributes** | GET,POST,PUT,DELETE /attributes, POST,PUT,DELETE /attributes/values | ttributes, ttribute_values |
| **Specifications**| GET,POST,PUT,DELETE /specifications, /specifications/groups, /specifications/values | specifications, specification_groups, specification_values, product_specifications |
| **Tags** | GET,POST,PUT,DELETE /tags | 	ags, product_tags |
| **Belts & Boxes**| GET,POST,PUT,DELETE /belts, GET,POST,PUT,DELETE /boxes | elts, oxes, product_belts, product_boxes |
| **Orders** | GET /orders, GET /orders/:id, PUT /orders/:id/status, PUT /orders/:id/payment-status | orders, order_items, order_addresses, order_status_history, shipments |
| **Customers** | GET,PUT,DELETE /users | customers, customer_addresses, customer_loyalty |
| **Offers** | GET,POST,PUT,DELETE /marketing/offers, GET /marketing/offers/analytics | offers, offer_categories, offer_variants, offer_rewards, offer_usages |
| **Media & Speed**| GET /media, POST /media/upload, PUT,DELETE /media/:id, GET,POST /media/optimization/* | media, media_variants, media_optimization_logs |
| **CMS** | GET,POST,PUT,DELETE /cms/pages, /cms/banners, /cms/testimonials, /cms/home-sections, /cms/community-images | pages, anners, 	estimonials, home_sections, community_images |
| **Care & Support**| GET,POST,PUT,DELETE /faq, GET,POST,PUT,DELETE /product-care | aqs, product_care_steps |
| **Settings** | GET,POST /system/settings | settings |
| **Design System**| GET,POST /system/settings (_group: 'design_system') | settings |
| **Taxes** | GET,POST,PUT,DELETE /system/taxes, /system/taxes/classes | 	ax_rates, 	ax_classes |
| **Shipping** | GET,POST,PUT,DELETE /system/shipping-methods | shipping_methods, shipping_zones, shipping_charges |

---

*Generated as Document 01 of 07 in Production Gap Analysis Series*

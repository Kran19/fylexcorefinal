# PAGE-BY-PAGE AUDIT REPORTS — FYLEX ENTERPRISE CMS

---

# Page 1: Dashboard (/admin/dashboard)
- **Score:** 78/100
- **Primary Issue:** Broken category doughnut chart toggle, hardcoded rocket greeting banner, 100% false growth indicator when yesterday's orders = 0.
- **Attached DB:** orders, customers, products, isitors, payments
- **APIs:** GET /api/dashboard, GET /api/reports/dashboard

---

# Page 2: Products Catalogue (/admin/products)
- **Score:** 82/100
- **Purpose:** Full watch catalog listing with Tabulator table, SKU display, stock alert badges, price ranges for variants, and action buttons.
- **Frontend Pages Affected:** /shop, /products, /discover, /configure, /pre-configure
- **APIs Attached:** GET /api/products, DELETE /api/products/:id
- **DB Tables:** products, product_variants, categories, media
- **Broken Logic / Issues:**
  - Hardcoded currency formatting $0.00 in getDisplayData() instead of INR (₹).
  - Search input filtering in DataTable.jsx is purely client-side; does not trigger server-side pagination query.
  - Image fallback in formatter relies on inline onerror attribute which causes hydrations issues in Next.js client components.

---

# Page 3: Product Creation Wizard (/admin/products/create / ProductWizard.jsx)
- **Score:** 75/100
- **Purpose:** 4-step wizard for creating watches, defining colors/themes, selecting attributes, cartesian variant generation, and per-variant SKU/price/stock management.
- **Frontend Pages Affected:** All storefront product pages.
- **APIs Attached:** POST /api/products, POST /api/products/:id/generate-variants, PATCH /api/variants/:id, POST /api/variants/:id/media
- **DB Tables:** products, product_variants, ariant_attributes, media
- **Broken Logic / Issues:**
  - Auto-generated slug uses basic regex that drops non-ASCII characters without fallback.
  - Variant image upload uses inline <input type="file"> triggering raw multipart forms instead of reusing the central MediaPickerModal.jsx.
  - In step 3, generating >100 variants relies on browser confirm() modal rather than a custom Admin UI dialog.

---

# Page 4: Product Edit (/admin/products/edit/[id])
- **Score:** 84/100
- **Purpose:** Comprehensive 5-step edit workspace featuring tabbed navigation (Basic Info, Story & Copy, Taxonomy, Variants, Theme & Live Preview).
- **Frontend Pages Affected:** /products/[id], /configure, /discover, /pre-configure
- **APIs Attached:** GET /api/products/:id, PUT /api/products/:id, GET /api/tags, GET /api/belts, GET /api/boxes
- **DB Tables:** products, product_variants, ariant_images, product_media, page_themes, product_belts, product_boxes
- **Broken Logic / Issues:**
  - Saves temporary draft to localStorage key draft_edit_ which can get out of sync if another admin edits the product on server.
  - Live preview iframe relies on postMessage with target origin '*', creating potential cross-window security leaks.
  - Strips theme properties during payload preparation using multiple delete payload.* calls, which is fragile if schema properties change.

---

# Page 5: Product Variants (/admin/products/variants)
- **Score:** 79/100
- **Purpose:** Global SKU and variant inventory matrix manager for editing prices, stock levels, and primary images across all watch configurations.
- **Frontend Pages Affected:** /configure, /cart, /checkout
- **APIs Attached:** GET /api/variants, PATCH /api/variants/:id, POST /api/variants/:id/media
- **DB Tables:** product_variants, ariant_attributes, ariant_images, media
- **Broken Logic / Issues:**
  - Inline editing of variant price and stock directly inside table cells lacks debouncing; fires save requests on every keystroke.
  - Filtering variants by attribute combination is missing.

---

# Page 6: Product Attributes & Values (/admin/products/attributes)
- **Score:** 85/100
- **Purpose:** Manage watch customisation parameters (e.g. Case Material, Dial Color, Movement, Strap Type) and their selectable values.
- **Frontend Pages Affected:** /configure, /products
- **APIs Attached:** GET,POST,PUT,DELETE /api/attributes, POST,PUT,DELETE /api/attributes/values
- **DB Tables:** ttributes, ttribute_values
- **Broken Logic / Issues:**
  - Swatch color picker for attribute values does not validate valid 6-digit hex format.
  - Deleting an attribute with active variants attached does not show a soft-warning listing affected products.

---

# Page 7: Product Specifications (/admin/products/specifications)
- **Score:** 83/100
- **Purpose:** Technical spec groups (Movement, Water Resistance, Case Diameter, Crystal) and pre-defined specification values.
- **Frontend Pages Affected:** /products/[id], /explore
- **APIs Attached:** GET,POST,PUT,DELETE /api/specifications, /api/specifications/groups, /api/specifications/values
- **DB Tables:** specifications, specification_groups, specification_values, product_specifications
- **Broken Logic / Issues:**
  - Group sorting relies on manual sortOrder numeric entry without drag-and-drop reordering.

---

# Page 8: Product Tags (/admin/products/tags)
- **Score:** 88/100
- **Purpose:** Product tagging engine for curating badges (e.g., "Limited Edition", "Chronograph", "Waterproof").
- **Frontend Pages Affected:** /shop, /products
- **APIs Attached:** GET,POST,PUT,DELETE /api/tags
- **DB Tables:** 	ags, product_tags
- **Broken Logic / Issues:**
  - Tag color and icon fields are optional, but missing fallbacks cause blank badges on storefront filters.

---

# Page 9: Belts / Watch Straps (/admin/belts)
- **Score:** 86/100
- **Purpose:** Manage watch strap catalogue, standalone belt pricing, stock availability, and image assignment for configure-to-order add-ons.
- **Frontend Pages Affected:** /pre-configure, /configure, /cart, /checkout
- **APIs Attached:** GET,POST,PUT,DELETE /api/belts
- **DB Tables:** elts, product_belts, cart_items, order_items
- **Broken Logic / Issues:**
  - Image picker modal assignment relies on optional imageId; if unassigned, falls back to generic placeholder without error warning.

---

# Page 10: Packaging Boxes (/admin/boxes)
- **Score:** 87/100
- **Purpose:** Custom luxury presentation boxes management for configure-to-order watch presentation.
- **Frontend Pages Affected:** /pre-configure, /configure
- **APIs Attached:** GET,POST,PUT,DELETE /api/boxes
- **DB Tables:** oxes, product_boxes
- **Broken Logic / Issues:**
  - Box price is not separate in schema (defaults to free add-on), preventing premium box upsells.

---

# Page 11: Inventory & Stock Management (/admin/inventory)
- **Score:** 80/100
- **Purpose:** Central stock monitoring, low-stock alerts, out-of-stock tracking, and quick stock quantity adjustments.
- **Frontend Pages Affected:** Storefront checkout stock validation.
- **APIs Attached:** GET /api/products/inventory, PATCH /api/products/inventory/:id, GET /api/system/inventory/low-stock
- **DB Tables:** product_variants, products, stock_history
- **Broken Logic / Issues:**
  - Stock update does not prompt for a mandatory changeReason, creating audit trail gaps in stock_history.

---

# Page 12 & 13: Categories (/admin/categories, /admin/categories/create, /admin/categories/edit/[id])
- **Score:** 84/100
- **Purpose:** Hierarchical category tree management, banner image assignment, and nav menu display flags.
- **Frontend Pages Affected:** Main Navigation Header, /shop, /categories
- **APIs Attached:** GET,POST,PUT,DELETE /api/categories, GET /api/categories/:id
- **DB Tables:** categories, category_product, category_attributes
- **Broken Logic / Issues:**
  - Parent-child circular reference is not validated on client-side (category can be set as its own parent).

---

# Page 14 & 15: Orders & Order Detail (/admin/orders, /admin/orders/[id])
- **Score:** 86/100
- **Purpose:** Complete order lifecycle management, status updates (pending -> confirmed -> shipped -> delivered), payment status overrides, PDF invoice generation, and tracking info.
- **Frontend Pages Affected:** /my-purchases, /thank-you
- **APIs Attached:** GET /api/orders, GET /api/orders/:id, PUT /api/orders/:id/status, PUT /api/orders/:id/payment-status, GET /api/orders/:id/invoice
- **DB Tables:** orders, order_items, order_addresses, order_status_history, shipments
- **Broken Logic / Issues:**
  - Invoice PDF download URL (/orders/:id/invoice) is unauthenticated in backend controller.
  - Manual status override does not trigger real-time customer email notification.

---

# Page 16 & 17: Offers & Coupons (/admin/offers, /admin/offers/create)
- **Score:** 82/100
- **Purpose:** Coupon code engine, percentage/fixed discounts, minimum cart value thresholds, customer segment targeting, and usage limits.
- **Frontend Pages Affected:** /cart, /checkout
- **APIs Attached:** GET,POST,PUT,DELETE /api/marketing/offers, GET /api/marketing/offers/analytics
- **DB Tables:** offers, offer_categories, offer_variants, offer_usages
- **Broken Logic / Issues:**
  - Coupon code input allows spaces and lowercase letters without auto-formatting to uppercase alphanumeric.

---

# Page 18: Customers & Users (/admin/users)
- **Score:** 81/100
- **Purpose:** Customer profile management, block/unblock account control, address history, and order count overview.
- **Frontend Pages Affected:** Customer login & checkout eligibility.
- **APIs Attached:** GET,PUT,DELETE /api/users
- **DB Tables:** customers, customer_addresses, orders
- **Broken Logic / Issues:**
  - Blocking a user does not immediately invalidate their active JWT token stored in browser localStorage.

---

# Page 19 & 20: Media & Speed Booster Hub (/admin/media, /admin/media/*)
- **Score:** 85/100
- **Purpose:** Complete asset library with virtual folder structure, Multer upload engine, and Sharp-based image optimization center (WebP/AVIF generation).
- **Frontend Pages Affected:** All image and video displays across the site.
- **APIs Attached:** GET,POST,PUT,DELETE /api/media, POST /api/media/upload, GET,POST /api/media/optimization/*
- **DB Tables:** media, media_variants, media_optimization_logs
- **Broken Logic / Issues:**
  - Unauthenticated file uploads permitted on /api/media/upload (up to 200MB per file).
  - Video optimization hub exists in frontend routes (/admin/media/video-optimization), but has no backend video transcoding pipeline.

---

# Page 21 to 28: CMS & Dynamic Content (/admin/cms, /admin/cms/home-sections, /admin/cms/about, /admin/cms/banners, /admin/pages, /admin/testimonials, /admin/community, /admin/faqs, /admin/care-steps, /admin/reviews)
- **Score:** 83/100
- **Purpose:** Complete dynamic content management suite for homepage layout sections, about story, promotional banners/sliders, legal pages, customer testimonials, community gallery, FAQs, care steps, and review moderation.
- **Frontend Pages Affected:** /, /about, /care-support, /policies/*, homepage sliders and gallery.
- **APIs Attached:** GET,POST,PUT,DELETE /api/cms/*, /api/faq, /api/product-care, /api/reviews
- **DB Tables:** anners, pages, 	estimonials, home_sections, community_images, aqs, product_care_steps, product_reviews
- **Broken Logic / Issues:**
  - Rich HTML content is rendered on storefront via dangerouslySetInnerHTML without server-side HTML sanitization (DOMPurify).
  - Popup management is missing dedicated admin CRUD interface despite schema support in popups table.

---

# Page 29: Reports & Analytics (/admin/reports)
- **Score:** 84/100
- **Purpose:** Business intelligence reports covering revenue analytics, order volume trends, inventory valuation, financial summary, and visitor traffic.
- **Frontend Pages Affected:** Admin executive reporting.
- **APIs Attached:** GET /api/reports/dashboard, /revenue, /orders, /inventory, /financial, /traffic, /variant-performance
- **DB Tables:** orders, order_items, payments, product_variants, isitors
- **Broken Logic / Issues:**
  - Traffic report relies on simple IP string matching in isitors table without bot/crawler filtering.

---

# Page 30 to 35: Settings Suite (/admin/settings, /admin/settings/design, /admin/settings/payments, /admin/settings/staff, /admin/login-settings)
- **Score:** 80/100
- **Purpose:** General store configuration, brand theme design system editor with live iframe preview, payment gateway credentials, staff account management, and portal security settings.
- **Frontend Pages Affected:** Global CSS variables (:root), footer contact info, payment gateway integration.
- **APIs Attached:** GET,POST /api/system/settings, POST /api/auth/admin/login
- **DB Tables:** settings, dmins
- **Broken Logic / Issues:**
  - Design system editor posts live preview message to iframe with wildcard target origin ('*').
  - General settings updates do not require secondary password confirmation when updating sensitive business parameters.

---

# Page 36 & 37: Taxes & Shipping (/admin/taxes, /admin/shipping)
- **Score:** 85/100
- **Purpose:** Tax class/rate configuration and shipping zone method configuration with weight/price threshold logic.
- **Frontend Pages Affected:** /checkout, order total calculation.
- **APIs Attached:** GET,POST,PUT,DELETE /api/system/taxes, /api/system/shipping-methods
- **DB Tables:** 	ax_rates, 	ax_classes, shipping_methods, shipping_zones, shipping_charges
- **Broken Logic / Issues:**
  - Tax calculation compound tax flag (isCompound) is stored in DB but not evaluated in order total calculation logic.

---

# Page 38 to 40: Notifications, Help, & Login (/admin/notifications, /admin/help, /admin/login)
- **Score:** 82/100
- **Purpose:** System notification logs, in-app admin guidance hub, and admin portal authentication entry point.
- **Frontend Pages Affected:** Admin access control.
- **APIs Attached:** POST /api/auth/admin/login
- **DB Tables:** dmins, 
otification_logs
- **Broken Logic / Issues:**
  - /admin/help page exists as a standalone route, but lacks a floating widget trigger integrated across the admin panel layout.

---

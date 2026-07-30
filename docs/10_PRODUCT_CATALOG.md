# 10 — PRODUCT & CATALOG MANAGEMENT

## Overview
The product catalog is the most complex domain in the system.
Products are not simple items — they have variants (SKUs), multiple media types,
attributes, specifications, compatible belts, compatible boxes, care steps,
page themes, and can be associated with offers.

---

## Core Entities

### Product
Table: products
The base watch model. Contains brand identity and content.

Key fields:
  id, name, slug, sku, productCode
  productType: likely 'watch', 'accessory' (enum not visible in schema)
  subtitle, tagline, heritageText — content copy
  heroImage — primary display image (JSON/URL)
  bgColor, accentColor, textColor, gradient, mistColor — per-product theme colors
  description, shortDescription — rich + plain text
  price — base price (Decimal)
  specialPrice, specialPriceStart, specialPriceEnd — time-limited discount
  sellingPrice — effective sale price
  manageStock, qty, inStock — inventory flags
  codAvailable — COD toggle per product
  status — published, draft, archived
  isFeatured, isNew, isBestseller — curation flags
  weight, length, width, height — physical dimensions
  viewed — view counter
  videoUrl — product video URL
  theme — JSON per-product theme override
  discoverHeroBgImage — image for discover section
  images — JSON array of media references
  metaTitle, metaDescription, metaKeywords — SEO fields
  brandId, taxClassId, mainCategoryId — FK references

### ProductVariant
Table: product_variants
The actual sellable SKU unit. Products have 1+ variants.

Key fields:
  id, productId (FK), sku — identification
  price, comparePrice, costPrice — pricing tiers
  specialPrice, specialPriceStart/End — time-limited discount
  sellingPrice — effective price shown to customer
  manageStock, qty (stock_quantity), reservedQuantity — stock
  inStock (boolean), stockStatus ('in_stock'|'out_of_stock'|'on_backorder')
  isActive, isDefault — variant flags
  isSoldConfiguration — marks configure-to-order variants
  fakeSoldCount — social proof counter
  combinationHash — unique hash of attribute combination
  weight, dimensions — physical properties
  deletedAt — soft delete

### Belt (Watch Strap)
Table: belts
Separate from variants — belts are cross-product add-ons.

Key fields:
  id, name, price, stock, isActive, imageId (FK to media)

Products link to belts via product_belts (many-to-many)
Belts appear as add-ons in configure page and cart
CartItem has beltId — belt can be added to cart
OrderItem has beltId — belt is part of order

### Box (Watch Packaging)
Table: boxes
Packaging options for watches.

Key fields:
  id, name, isActive, imageId (FK to media)

Products link to boxes via product_boxes (many-to-many)
Boxes selectable in configure flow

---

## Media System

### Media Table
Every file uploaded to the system gets a media record.
  id, disk ('local'), filePath, fileName, originalFilename
  mimeType, fileType ('image'|'video'), extension, fileSize
  width, height, thumbnails (JSON)
  altText, title, description — SEO/accessibility
  uploadedBy, uploaderType — who uploaded
  metadata (JSON), folderPath — organisation
  serveMode, primaryVariantId — optimization flags
  isOptimized, optimizationSavedBytes

### Product Media Relationship
Product -> product_media -> Media (type: 'GALLERY', 'TECHNICAL')
Variant -> variant_images -> Media (type: 'GALLERY', isPrimary flag)
One variant can have multiple images; one as primary

### Media Files Currently in uploads/
75 files: PNG images (4-12MB each), 3 MP4 videos (~104MB each)
Named with random 32-char hex + extension

### Media Optimization (Sharp)
MediaVariant table: stores optimized variants
  format: 'webp'|'avif'|'jpeg'|'png'|'mp4'
  preset: 'lossless'|'balanced'|'max_compression'|'custom'
  quality: 1-100
  compressionRatio: recorded savings

Workflow:
  1. Upload original file → media record
  2. Admin triggers optimization → POST /media/optimization/process/:id
  3. Sharp creates MediaVariant (webp or avif)
  4. Admin reviews savings → accepts or rejects
  5. If accepted: primary variant serves optimized file

---

## Attribute System

Used for generating variants.

### Attribute
  id, name, code, type, isVariant (true = generates variant combinations)
  isFilterable, isRequired, status, sortOrder

### AttributeValue
  id, attributeId, value, label, code
  colorCode — hex color for color-type attributes
  imageId — image for swatch display
  status, sortOrder

### Variant Generation
ProductWizard Step 5:
  Admin selects which attribute values per attribute
  POST /api/products/:id/generate-variants { selections: [...] }
  variant-generator.service.ts computes cartesian product
  Creates ProductVariant for each combination
  Sets combinationHash (unique identifier)
  Sets VariantAttribute records linking variant to its attribute values

Example:
  Dial: [Black, White] x Strap: [Leather, Metal] = 4 variants
  Each variant is an independent sellable SKU

---

## Specification System

Technical specifications shown on product detail page.
Not variant-generating — purely informational.

### Specification
  id, name, code, type, sortOrder, isActive, isFilterable, isRequired

### SpecificationGroup
  id, name, sortOrder
  Groups specs into logical sections (e.g., "Movement", "Case", "Strap")

### SpecificationValue
  id, specificationId, value, sortOrder, status
  Pre-defined values that can be selected

### ProductSpecification
  id, productId, variantId, specificationId, specificationValueId, value
  Stores the selected spec value for a product (or variant)

### CategorySpecGroup
  Links which spec groups appear for products in a category

---

## Care Steps

### ProductCareStep
  id, productId, stepNumber, title, description (TEXT), imageUrl
  Ordered by stepNumber
  Grouped by product in admin
  API: GET /product-care/grouped
  Customer page: /care-support

---

## Page Themes

### PageTheme
  id, productId, pageName, themeJson (TEXT — JSON)
  Allows per-product, per-page visual customisation

  Example: Product 5 might have a special dark theme for its /configure page
  Admin edits via ProductWizard Step 8 (Theme)
  Frontend reads themeJson and applies CSS overrides

---

## Pricing Logic

Price resolution order (highest priority first):
  1. specialPrice (if current date is within specialPriceStart/End)
  2. sellingPrice
  3. price (base price)

Multiple prices tracked:
  comparePrice — crossed-out "was" price for sale display
  costPrice — internal cost margin tracking
  Price history: price_histories table tracks all price changes

Tier pricing: tier_prices table
  minQuantity, maxQuantity — bulk discount thresholds
  customerGroup / customerSegmentId — segment-specific pricing
  startsAt, endsAt — time-bound tier prices

---

## Configure Flow (Frontend)

Customer journey through configuration:

/discover — Sees all watches in a grid
  - GET /products (active)
  - Each card has "Configure" link → /configure?watch=<id>

/pre-configure — Pre-selection of belt and box
  Page: app/(customer)/pre-configure/page.jsx (29KB)
  Fetches product details + compatible belts + boxes
  Customer selects preferred belt and box
  Continues to /configure with selections

/configure — Main configurator
  Page: app/(customer)/configure/page.jsx (32KB)
  Features:
    - Variant selector (dial, material, etc.)
    - Belt selector with GSAP horizontal scroll pinning
    - Box selector
    - Live price update
    - Add to cart
  State: local component state + OrderContext
  API: GET /products/:id (full details), GET /boxes, GET /belts

---

## Product Listing (Customer)

/products page (37KB):
  - GET /products?status=active
  - Filtering by category, price range, belt type
  - Sorting by price, name, date
  - No server-side pagination detected in customer endpoint — frontend filters

/discover page (4.7KB):
  - GET /products (simplified grid)
  - 12 per page (page: 1, limit: 12)
  - Links: Explore + Configure per product

---

## Product Admin (ProductWizard.jsx — 22KB, 9 Steps)

Step 1: Basic Info — name, SKU, slug, product type, subtitle, tagline, code
Step 2: Pricing — price, selling price, compare price, cost price, special price + dates
Step 3: Categories & Tags — multi-select
Step 4: Media — hero image, gallery images, technical images, video URL
         Uses MediaPickerModal for selection from library
         Supports 360-degree media upload (POST /products/:id/media/360)
Step 5: Attributes & Variants — attribute selection + variant generation
         Shows existing variants with price/stock edit
Step 6: Specifications — select spec groups and values
Step 7: Belts & Boxes — compatible belt and box assignment
Step 8: Theme — per-product color pickers (bgColor, accentColor, textColor, gradient)
Step 9: SEO — metaTitle, metaDescription, metaKeywords

---

## Related Products

Cross-sell, upsell, related products via junction tables:
  related_products, cross_sell_products, upsell_products
  All: productId -> relatedProductId (self-referential on products)

---

## Inventory Management

ProductVariant.qty = current stock quantity
ProductVariant.reservedQuantity = items in active carts (reserved)
ProductVariant.inStock / stockStatus = derived flags

Stock changes:
  - Purchase: qty decremented by orderService
  - Cancel: qty restored by cancelOrder()
  - Manual update: PATCH /products/inventory/:id
  - Stock history: stock_history table records all changes

Low stock report:
  GET /system/inventory/low-stock
  Returns variants below a threshold

Warehouse stocks (multi-warehouse schema):
  warehouse_stocks table: per-warehouse quantities
  Currently: single pickup location (Ahmedabad)
  Multi-warehouse: schema ready, implementation status unknown

---

## Reviews

Customer reviews linked to:
  product_reviews.productId — review for a product
  product_reviews.productVariantId — optional: review for a specific variant
  product_reviews.orderItemId — optional: verified purchase review

Review fields:
  rating (1-5), title, comment (text)
  status: 'pending'|'approved'|'rejected'
  isVerified, isFeatured, isAdminReview
  helpfulCount, notHelpfulCount — community voting
  images: ReviewImage records (FK to media)
  votes: ReviewVote records

Admin moderation:
  PATCH /reviews/:id/status — approve or reject review

---

*Document 10 of 20 — FYLEX Enterprise Documentation Suite*

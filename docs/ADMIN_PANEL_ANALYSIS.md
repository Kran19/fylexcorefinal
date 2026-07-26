# Admin Panel Analysis

## 1. Overview
The FYLEX Admin Panel is the central command center for managing the e-commerce catalog, orders, and marketing content. It interacts with the NestJS backend via JWT-authenticated REST APIs.

## 2. Core Modules & Functionality

### 2.1 Product & Variant Management
- **Products:** Admins can create base models, assign categories, tax classes, and brands. They define the universal styling (bg color, gradients) and base pricing.
- **Variants:** The most complex part of the admin panel. Admins generate SKUs based on combinations of attributes (e.g., Dial Color, Bracelet). Each variant can have overridden pricing and stock.
- **Specifications:** Managed through groups (e.g., "Movement", "Case Dimensions") and attached globally or per product.

### 2.2 Media & Asset Management
- **Media Library:** A centralized repository for all uploaded images, banners, and videos. 
- **Linking:** Admins must manually link media from the library to specific products, variants, or banners.
- **Videos:** Stored either as direct uploads in the media table or as external URLs (`videoUrl` on `Product`).

### 2.3 Marketing (Offers & Banners)
- **Offers:** Extremely flexible promotion engine supporting `Buy X Get Y`, minimum cart amounts, flat/percentage discounts, and customer segment targeting. Offers can be tied directly to specific variants or entire categories.
- **Banners:** Managed with start/end dates, CTA links, and positions to drive dynamic homepage content.

## 3. Missing Features & Pain Points

Based on the schema and architecture analysis, the following critical features are missing from the admin experience:

### 3.1 Automated Image Mapping
- **Issue:** Admins have to manually attach images to every single variant. For a watch with 5 dial colors and 4 bracelets, that's 20 variants requiring manual gallery configuration.
- **Missing Feature:** A bulk-upload utility that reads a ZIP of images and auto-maps them based on filename conventions (e.g., `SKU-primary.jpg`).

### 3.2 Visual Variant Builder
- **Issue:** The variant combination hash logic is rigid.
- **Missing Feature:** A visual matrix in the UI showing exactly which Dial + Bracelet combinations exist, are out of stock, or are missing images, highlighting gaps in the catalog.

### 3.3 Dashboard Analytics
- **Issue:** The backend has `ActivityLog` and `Order`, but lacks aggregated material views for deep analytics.
- **Missing Feature:** Real-time visual reporting on "Most popular variant configurations" or "Abandoned cart recovery rate".

### 3.4 Soft Delete Recovery
- **Issue:** Entities have `deletedAt` for soft deletes, but there is rarely a "Recycle Bin" UI for admins to recover accidentally deleted products or offers.

# Project Overview

## 1. Project Purpose
**FYLEX** is a premium watch e-commerce platform designed to offer a high-end shopping experience. It allows customers to browse luxury watches, pre-configure specific combinations (dials, bracelets, boxes), and complete a secure checkout process. The platform also includes a robust admin panel for managing the complex catalog, inventory, and dynamic marketing campaigns (popups, banners, offers).

## 2. Business Flow
1. **Catalog Management:** Admins define base watches and configure complex variant matrices (SKUs based on Dial/Bracelet combos).
2. **Marketing & Engagement:** Admins launch Offers (Buy 1 Get 1, Tiered Discounts) and Popups targeting specific Customer Segments.
3. **Customer Acquisition:** Customers land on the visually rich (GSAP-animated) homepage or discover page.
4. **Sales Conversion:** Customers configure their perfect watch, add to cart, and checkout via an integrated payment gateway.
5. **Post-Sale:** The system handles order status tracking, stock decrementing, and loyalty point accrual.

## 3. User Journeys

### 3.1 Customer Flow
- **Discovery:** Enters `/` or `/discover`. Browses high-resolution lifestyle images.
- **Pre-Configure Flow (`/pre-configure`):** Selects a base watch family.
- **Configure Flow (`/configure`):** The interactive customizer where the user selects a Dial and Bracelet. The UI updates in real-time.
- **Cart (`/cart`):** Applies discount codes, uses loyalty points, estimates shipping.
- **Checkout (`/checkout`):** Provides shipping/billing addresses, pays via gateway (Razorpay).
- **Post-Purchase (`/my-purchases`):** Tracks shipment, leaves reviews (with images), and manages wishlist.

### 3.2 Admin Flow
- **Authentication:** Logs into the secure admin portal.
- **Product Setup:** Creates a new base watch model -> creates attributes (Steel, Leather, Rose Gold) -> generates Variants -> maps Media.
- **Inventory Transfer:** Manages stock levels across multiple Warehouses using the `StockTransfer` module.
- **Campaign Execution:** Sets up a promotional Banner on the homepage and a targeted Popup for returning customers.
- **Order Fulfillment:** Monitors incoming orders, updates tracking numbers, and handles returns/refunds.

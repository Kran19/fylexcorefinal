# 12 — CMS & CONTENT MANAGEMENT

## Overview
FYLEX has a custom data-driven CMS built directly into the NestJS backend.
All content is stored in PostgreSQL and managed from the admin panel.
There is NO headless CMS (no Contentful, Sanity, Strapi) — the CMS is bespoke.

---

## CMS Entities

### 1. Pages (Static Pages)
Table: pages
Fields: id, title, slug (unique), content (TEXT — rich HTML), metaTitle, metaDescription, isActive

Usage:
  - Legal pages (Terms of Service, Privacy Policy, Refund Policy)
  - Custom marketing pages
API: GET/POST/PUT/DELETE /cms/pages
Admin: /admin/pages
Customer frontend: /policies/* (reads from GET /policies or GET /cms/pages)

### 2. Banners (Promotional Banners)
Table: banners
Fields:
  id, name, title, subtitle, content (TEXT)
  image (URL or path), link, ctaText, ctaLink
  textColor, type, position
  isActive, sortOrder
  startsAt, endsAt — scheduled display
API: GET /cms/banners?position=... (active only), GET /cms/all-banners (admin)
Admin: /admin/cms (banners section)
Usage: Hero banner, promotional popup banners, section banners

### 3. Testimonials
Table: testimonials
Fields: id, name, designation, message (TEXT), rating, image, isActive, sortOrder
API: GET/POST/PUT/DELETE /cms/testimonials
Admin: /admin/testimonials
Customer: Displayed on home page (testimonials section)

### 4. Home Sections
Table: home_sections
Fields: id, title, type, content (TEXT — JSON or HTML), isActive, sortOrder

Also: home_page_sections (more complex)
Fields: id, name, title, content, type, data (JSON), displayRules (JSON), sortOrder, status
Purpose: Advanced home page section management with display rules

API: GET/POST/PUT/DELETE /cms/home-sections
Admin: /admin/cms
Usage: Dynamic home page section ordering and content

### 5. Community Images (Atelier Chronicles)
Table: community_images
Fields: id, title, image (path), sortOrder, isActive
API:
  GET /cms/community-images — Active only (customer-facing gallery)
  GET /cms/community-images/all — All (admin)
Admin: /admin/community
Customer: "Atelier Chronicles" section on home page

### 6. Popups
Table: popups
Fields:
  id, name, title, content, image, link, type, trigger
  delaySeconds — auto-show delay
  isActive
  displayRules, targetingRules (JSON) — audience targeting
  startsAt, endsAt
  impressions, conversions — analytics counters
API: GET /cms/popups (active popups only)
Usage: Newsletter popup, promotional popup, exit-intent popup

### 7. FAQs
Table: faqs
Fields: id, question, answer (TEXT), sortOrder, isActive
API:
  GET /faq — All FAQs (admin)
  GET /faq/active — Active only (customer-facing)
Admin: /admin/faqs
Customer: FAQ section on home and /care-support page

### 8. Product Care Steps
Table: product_care_steps
Fields: id, productId, stepNumber, title, description (TEXT), imageUrl
API:
  GET /product-care/grouped — Grouped by product (customer)
  GET /product-care/product/:productId — Steps for one product
Admin: /admin/care-steps
Customer: /care-support page

### 9. Policies
Table: (uses pages table or a separate policy table)
API: GET/POST/PUT/DELETE /policies, GET /policies/:id
Customer: /policies page
Usage: Privacy policy, terms of service, return/refund policy

### 10. Waitlist
Table: waitlist
Fields: id, email (unique), name, type
Purpose: Email capture for product launches or waitlist
No admin UI endpoint confirmed — managed via direct DB or future feature

---

## Settings as CMS

The settings table (group/key/value) serves as a key-value CMS for:

design_system group:
  brand-primary, brand-secondary, brand-accent
  bg-primary, text-primary, text-secondary
  btn-primary-bg, btn-primary-text, btn-radius, radius-global
  (All CSS variable values managed from /admin/settings/design)

general group: (likely) site name, contact email, phone, address, social links

payment group: payment method toggles

seo group: default meta tags

feature_toggles group: feature on/off switches

Access:
  GET /system/settings — all settings (public + private)
  POST /system/settings — bulk update with _group prefix

---

## Design System CMS (Live Preview Feature)

This is the most sophisticated CMS feature.

Location: /admin/settings/design

Mechanism:
  1. Admin panel shows color pickers for brand-primary, brand-accent, etc.
  2. Storefront embedded as <iframe> in admin panel
  3. Admin changes a color → React state updates
  4. useEffect fires postMessage to iframe:
       iframe.contentWindow.postMessage({ type: 'UPDATE_DESIGN_SYSTEM', payload: settings }, '*')
  5. Storefront (DesignSystemContext) listens:
       window.addEventListener('message', handler)
       if type === 'UPDATE_DESIGN_SYSTEM': updates CSS variables live
  6. Admin sees real-time preview of brand colors on storefront
  7. Admin clicks Save → POST /system/settings with _group: 'design_system'

Product Theme Preview:
  type === 'PREVIEW_PRODUCT_THEME': updates productOverrides in DesignSystemContext
  Used to preview per-product theme variations

Default preview URL: /discover?watch=6
Admin can change previewUrl to any storefront page

---

## Content Architecture Diagram

Admin Panel                     Database                     Storefront
/admin/cms/banners   ->  banners table           ->  Home page hero section
/admin/testimonials  ->  testimonials table      ->  Home page reviews section
/admin/community     ->  community_images table  ->  Atelier Chronicles section
/admin/cms/sections  ->  home_sections table     ->  Dynamic home sections
/admin/pages         ->  pages table             ->  /policies/* routes
/admin/faqs          ->  faqs table              ->  FAQ section + /care-support
/admin/care-steps    ->  product_care_steps      ->  /care-support page
/admin/settings/design -> settings table         ->  CSS variables on :root (global theme)

---

## Rich Content Storage

All rich content fields store HTML or JSON as TEXT in PostgreSQL.
No WYSIWYG editor detected in component inspection — admin may use textarea.
Components for rendering: dangerouslySetInnerHTML in Next.js (sanitization not confirmed)

---

## URL / Slug Management

pages table has slug field (unique) for URL routing
categories table has slug field
products table has slug field
tags, brands have slug fields

Frontend routing:
  /policies/[slug] or /policies page reads slug from URL
  No slug-based dynamic routing confirmed for products in inspected files
  Products are accessed by ID: /products?id=... or /configure?watch=...

---

## SEO Per Entity

seo_metadata table provides per-entity SEO:
  entityType, entityId, title, description, keywords
  ogTitle, ogDescription, ogImage, ogType
  twitterCard, twitterTitle, twitterDescription, twitterImage
  canonicalUrl, robots, isNoindex, isNofollow
  structuredData (JSON-LD)

NOTE: This table exists in schema. Whether it is fully populated via admin UI
is not confirmed from inspected code.

---

*Document 12 of 20 — FYLEX Enterprise Documentation Suite*

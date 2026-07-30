# GLOBAL SETTINGS AUDIT — FYLEX ENTERPRISE CMS

> **Document Type:** Production Readiness & Global Configuration Audit
> **Project:** FYLEX Premium Watches
> **Repository Source:** Fylex-final Codebase Inspection (100% Empirical)

---

## Executive Summary

The global settings engine of FYLEX operates via a dynamic key-value table (settings in PostgreSQL) grouped by domain (general, design_system, smtp, payment, shipping, seo, currency). This audit verifies every single setting for functionality, storage, API consumption, and storefront propagation.

---

## Global Settings Verification Matrix

| Setting Domain | Key / Variable | Storage Table | API Endpoint | Consuming Frontend Pages | Functional Status & Audit Findings |
|---|---|---|---|---|---|
| **Brand Kit** | rand-primary | settings | GET/POST /system/settings | All Storefront Pages via DesignSystemContext | ✅ **Working.** Injects --ds-brand-primary onto :root. Defaults to Kokushoku Black (#161413). |
| **Brand Kit** | rand-secondary | settings | GET/POST /system/settings | All Storefront Pages | ✅ **Working.** Injects --ds-brand-secondary. |
| **Brand Kit** | rand-accent | settings | GET/POST /system/settings | All Storefront Pages | ✅ **Working.** Injects --ds-brand-accent. Defaults to High Contrast White (#FFFFFF). |
| **Brand Kit** | rand-silver | settings | GET/POST /system/settings | All Storefront Pages | ✅ **Working.** Injects --ds-brand-silver (#999B98 Walrus Gray). |
| **Brand Kit** | rand-cream | settings | GET/POST /system/settings | All Storefront Pages | ✅ **Working.** Injects --ds-brand-cream (#FFF6ED Fatback Cream). |
| **Buttons & Radius**| tn-primary-bg<br>tn-radius | settings | GET/POST /system/settings | Header, Hero CTA, Configurator | ✅ **Working.** Controls primary CTA background and pill border-radius (999px). |
| **Company Info** | site_name | settings | GET /system/settings | Header, Footer, Page Head Titles | ⚠️ **Partial.** Stored in DB, but pp/layout.tsx hardcodes title "FYLEX Premium Watches". |
| **Company Info** | contact_email | settings | GET /system/settings | Footer, Care Support Page | ✅ **Working.** Displayed in storefront footer. |
| **Company Info** | contact_phone | settings | GET /system/settings | Footer, Care Support Page | ✅ **Working.** Consumed by contact links. |
| **Company Info** | contact_address | settings | GET /system/settings | Footer | ✅ **Working.** Displays business address. |
| **Email (SMTP)** | SMTP_HOST<br>SMTP_USER | NestJS .env | Internal AuthService | Password Reset Emails | ⚠️ **Needs Review.** Configured in backend .env via Nodemailer. Needs production SMTP credentials verification. |
| **Payment (Razorpay)**| RAZORPAY_KEY_ID | NestJS .env | POST /payments/create-order | /checkout Razorpay SDK modal | ⚠️ **SECURITY RISK.** Live production API keys (zp_live_*) are committed in backend .env. Must move to server secrets manager. |
| **Payment (COD)** | codAvailable | Calculated via Shiprocket API | POST /orders/calculate-shipping | /checkout Payment Mode Selector | ✅ **Working.** Dynamically toggles COD radio button based on delivery pincode serviceability check. |
| **Shipping (Shiprocket)**| SHIPROCKET_EMAIL<br>SHIPROCKET_PICKUP_PINCODE | NestJS .env | ShiprocketService | /checkout Shipping Calculation | ✅ **Working.** Authenticates against Shiprocket v2 API; uses pickup pincode 380001 (Ahmedabad) with 15-minute cache. |
| **SEO Defaults** | meta_title<br>meta_description | settings / seo_metadata | GET /system/settings | Root Layout & Pages | ⚠️ **Needs Review.** Default meta title and description in layout.tsx are static strings rather than consuming dynamic settings. |
| **Live iFrame Preview** | UPDATE_DESIGN_SYSTEM | Memory / window.postMessage | N/A | Embedded Storefront iFrame in /admin/settings/design | ⚠️ **Security Finding.** postMessage target origin is set to '*'. Must restrict to window.location.origin. |

---

## Detailed Remediation Recommendations

1. **Move Secrets out of .env Repo File**: Extract RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SHIPROCKET_EMAIL, and SHIPROCKET_PASSWORD from .env and load via environment environment variables on the VPS instance.
2. **Dynamic Storefront Title Integration**: Update pp/layout.tsx to read site_name and meta_description dynamically from the system settings API.
3. **Restrict iFrame postMessage Origin**: Update 
ext_/app/admin/settings/design/page.jsx line 63 from iframeRef.current.contentWindow.postMessage(..., '*') to window.location.origin.

---

*Generated as Document 04 of 07 in Production Gap Analysis Series*

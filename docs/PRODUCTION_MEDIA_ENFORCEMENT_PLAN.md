# Production Media Enforcement Plan — FYLEX

## Production Rollout Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND API VARIANT EXPANSION                                 │
│ • Update NestJS MediaService `getAllMedia()` to include `variants: true`│
│ • Resolve MediaVariant relations dynamically across NestJS controllers │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: CENTRALIZED HELPER UTILITY HARDENING                          │
│ • Update `getFileUrl(path)` in `next_/lib/utils.js` to look up WebP    │
│   variants even when given raw `/uploads/[hash].png` string inputs     │
│ • Add cached string-to-variant mapping in frontend utility             │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: COMPONENT & MODAL STANDARDIZATION                             │
│ • Update `MediaPickerModal.jsx` to return full `Media` entity with     │
│   compressed variant URLs                                              │
│ • Refactor Admin forms (`care-steps`, `login-settings`, `settings`)   │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: VERIFICATION & REGRESSION TESTING                             │
│ • Verify zero raw `/api/uploads/[hash].png` URLs are served on live UI │
│ • Run PageSpeed Insights performance audit to verify LCP & FCP gains  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Required Regression Tests

1. **Storefront Product Catalog:** Verify product images on `/shop`, `/products`, and `/` render WebP images.
2. **Watch Configurator:** Verify watch strap and dial overlays on `/configure` load WebP files without broken transparent backgrounds.
3. **Admin Panel Selection:** Select a new banner in `/admin/cms/banners` and verify the saved URL points to the optimized WebP asset.
4. **Invoice PDF Generation:** Verify Tax Invoices generate clean PDFs without broken image links.

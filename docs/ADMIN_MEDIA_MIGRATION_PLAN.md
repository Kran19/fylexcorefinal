# Admin Media Library Migration Plan — FYLEX

## Executive Objective
Transition 100% of Admin Panel modules from legacy native `<input type="file">` uploaders to the unified, single-source-of-truth **`MediaPickerModal`** (`next_/components/admin/MediaPickerModal.jsx`).

---

## Migration Roadmap Phases

```
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 1: STANDARD COMPLIANT MODULES (ALREADY USING MEDIA PICKER)│
│ • Products Wizard & Product Edit Workspace                       │
│ • Categories Create & Edit                                       │
│ • Watch Boxes & Watch Belts / Straps                             │
│ • Global Settings (Logo & Favicon)                               │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 2: HIGH-PRIORITY CMS MODULE MIGRATION                     │
│ • Homepage CMS (`/admin/cms/home-sections`)                     │
│   - Replace native file inputs with MediaPickerModal             │
│ • About Page CMS (`/admin/cms/about`)                           │
│   - Replace video/image inputs with MediaPickerModal             │
│ • Banners Manager (`/admin/cms/banners`)                        │
│   - Replace banner file inputs with MediaPickerModal             │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 3: AUXILIARY MODULE MIGRATION                              │
│ • Community Wristshots (`/admin/community`)                      │
│   - Replace file inputs with MediaPickerModal                    │
│ • Watch Care Steps (`/admin/care-steps`)                        │
│   - Replace file inputs with MediaPickerModal                    │
│ • Admin Login Settings (`/admin/login-settings`)                 │
│   - Replace file inputs with MediaPickerModal                    │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 4: CLEANUP & ENFORCEMENT                                   │
│ • Remove all redundant inline handleFileUpload functions         │
│ • Restrict POST /api/media/upload to Media Management Center    │
│ • Verify 100% single-source-of-truth compliance                  │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ PHASE 5: VERIFICATION & E2E LINT AUDIT                           │
│ • Run full build verification                                    │
│ • Confirm zero broken imports, zero console warnings             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Migration Spec per Module

### 1. Homepage CMS (`next_/app/admin/cms/home-sections/page.jsx`)
- **Current State:** 4 inline `<input type="file">` elements for `home_hero_video`, `home_s2_img`, `home_s3_img`, `home_legacy_video`.
- **Target State:** Integrate `MediaPickerModal` with state target `pickerTarget` (`hero_video`, `s2_img`, `s3_img`, `legacy_video`).

### 2. About Page CMS (`next_/app/admin/cms/about/page.jsx`)
- **Current State:** 3 inline `<input type="file">` elements for `shop_hero_video`, `shop_deepsea_video`, `shop_dial_image`.
- **Target State:** Integrate `MediaPickerModal` with state target `pickerTarget`.

### 3. Banners Manager (`next_/app/admin/cms/banners/page.jsx`)
- **Current State:** 1 inline `<input type="file">` element for `banner_image`.
- **Target State:** Integrate `MediaPickerModal` for banner image selection.

### 4. Community Gallery (`next_/app/admin/community/page.jsx`)
- **Current State:** 1 inline `<input type="file">` element for community wristshots.
- **Target State:** Integrate `MediaPickerModal`.

### 5. Watch Care Steps (`next_/app/admin/care-steps/page.jsx`)
- **Current State:** 1 inline `<input type="file">` element for care step illustration.
- **Target State:** Integrate `MediaPickerModal`.

### 6. Login Settings (`next_/app/admin/login-settings/page.jsx`)
- **Current State:** 1 inline `<input type="file">` element for portal login branding.
- **Target State:** Integrate `MediaPickerModal`.

# Admin UI Component & Form Implementation Plan — FYLEX

## 1. Admin Component Standards

- **Media Picker Modal Integration:** Standardize all CMS form components (`/admin/cms/banners`, `/admin/settings`, `/admin/care-steps`) to use `MediaPickerModal`.
- **Selection Payload:** Ensure `MediaPickerModal` returns the full `Media` entity with `variants` array.
- **Preview Component:** Render live WebP thumbnails with side-by-side master comparison controls.

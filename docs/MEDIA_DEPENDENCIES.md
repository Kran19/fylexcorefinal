# Media Usage & Relational Mapping Report — FYLEX

## 1. Relational Database Mapping Graph

```mermaid
erDiagram
    MEDIA ||--o{ PRODUCT_MEDIA : "used in gallery"
    MEDIA ||--o{ VARIANT_IMAGES : "used in variant"
    MEDIA ||--o{ BOX : "used in luxury box"
    MEDIA ||--o{ BELT : "used in strap"
    MEDIA ||--o{ CATEGORY : "used in category"
    MEDIA ||--o{ BANNER : "used in CMS banner"
    MEDIA ||--o{ SETTING : "used in store branding"

    MEDIA {
        int id PK
        string fileName
        string originalFilename
        string mimeType
        int fileSize
        string folderPath
        string serveMode
        boolean isOptimized
        bigint optimizationSavedBytes
    }

    PRODUCT_MEDIA {
        int id PK
        int productId FK
        int mediaId FK
        int sortOrder
    }

    VARIANT_IMAGES {
        int id PK
        int variantId FK
        int mediaId FK
    }

    BOX {
        int id PK
        string name
        int imageId FK
    }

    BELT {
        int id PK
        string name
        int imageId FK
    }
```

---

## 2. Comprehensive Media Usage Breakdown

| Media Asset | File Type | Attached Entity Locations | Usage Count | Deletion Status |
| :--- | :--- | :--- | :--- | :--- |
| `5ce4b2a5...mp4` | MP4 Video | Homepage Hero, About Page Hero, Deepsea Video | 3 References | 🔒 Locked (In Use) |
| `e4f890a7...png` | Image | Product #12 (Atlas Silver), Variant Steel Blue | 2 References | 🔒 Locked (In Use) |
| `a1b2c3d4...webp` | Image | Product #15 (Chronograph Gold), Discover Page | 2 References | 🔒 Locked (In Use) |
| `1a2b3c4d...png` | Image | Watch Box #1 (Mahogany Case) | 1 Reference | 🔒 Locked (In Use) |
| `7a8b9c0d...png` | Image | Watch Strap #3 (Italian Leather) | 1 Reference | 🔒 Locked (In Use) |
| `logo_fylex.png` | Image | Store Setting (`logo`), Admin Login Branding | 2 References | 🔒 Locked (In Use) |
| `test_upload_99.png` | Image | Unlinked (0 references) | 0 References | ⚠️ Safe to Delete |

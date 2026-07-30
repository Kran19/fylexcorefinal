# Media Schema Analysis — FYLEX Premium Watches

## 1. Complete Database Schema Definitions (Prisma ORM)

```prisma
model Media {
  id               Int              @id @default(autoincrement())
  disk             String           @default("public")
  filePath         String?          @map("file_path")
  fileName         String           @map("file_name")
  originalFilename String           @map("original_filename")
  mimeType         String           @map("mime_type")
  fileType         String?          @map("file_type")
  extension        String
  fileSize         Int              @map("file_size")
  width            Int?
  height           Int?
  thumbnails       String?
  serveMode        String?          @default("auto") @map("serve_mode")
  primaryVariantId Int?             @map("primary_variant_id")
  isOptimized      Boolean          @default(false) @map("is_optimized")
  optimizationSavedBytes BigInt     @default(0) @map("optimization_saved_bytes")

  variants         MediaVariant[]
  productMedia     ProductMedia[]
  variantImages    VariantImage[]
  beltImages       Belt[]           @relation("BeltImage")
  boxImages        Box[]            @relation("BoxImage")
  categoryImages   Category[]       @relation("CategoryImage")
  brandLogos       Brand[]          @relation("BrandLogo")
  reviewImages     ReviewImage[]
  attributeValues  AttributeValue[] @relation("AttributeValueImage")
}

model MediaVariant {
  id               Int       @id @default(autoincrement())
  mediaId          Int       @map("media_id")
  format           String    // "webp" | "avif" | "jpeg" | "png" | "mp4"
  preset           String    @default("balanced")
  quality          Int       @default(80)
  width            Int?
  height           Int?
  filePath         String    @map("file_path")
  fileSize         BigInt    @map("file_size")
  compressionRatio Float     @default(0) @map("compression_ratio")
  media            Media     @relation(fields: [mediaId], references: [id], onDelete: Cascade)
}

model ProductMedia {
  id        Int       @id @default(autoincrement())
  productId Int       @map("product_id")
  mediaId   Int       @map("media_id")
  type      String    @default("GALLERY") @map("type") // "MAIN" | "GALLERY" | "HERO_BG"
  sortOrder Int       @default(0) @map("sort_order")
  media     Media     @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  product   Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model VariantImage {
  id               Int            @id @default(autoincrement())
  productVariantId Int            @map("product_variant_id")
  mediaId          Int            @map("media_id")
  type             String         @default("GALLERY") // "MAIN" | "GALLERY" | "HERO_BG"
  media            Media          @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  productVariant   ProductVariant @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
}
```

---

## 2. Product Image Storage Formats (Answer to Part 2)

Product images in FYLEX exist simultaneously in **two formats**:

1. **Format A: Scalar JSON String Array (Legacy Model)**
   - Column: `Product.images`
   - Content: `["/uploads/539a3f9d73a8bfc137aa88416b94f892.png"]`
   - Evaluation: Storage Option A & B. Contains raw string filenames only. Completely lacks `mediaId`, `variants`, and `serveMode`.

2. **Format D & E: Relational Join Tables (Enterprise DAM Model)**
   - Table: `ProductMedia` (`productId`, `mediaId`, `type`)
   - Table: `VariantImage` (`productVariantId`, `mediaId`, `type`)
   - Evaluation: Storage Option D & E. Links directly to the `Media` entity and its child `MediaVariant` compressed files (`/uploads/optimized/webp/...`).

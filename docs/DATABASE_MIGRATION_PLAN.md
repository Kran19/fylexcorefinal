# Database Migration & Schema Plan — FYLEX

## 1. Required Schema Enhancements

```prisma
// Phase 1 Additions (Non-breaking Optional FKs)
model Setting {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  value     String
  mediaId   Int?     @map("media_id")
  media     Media?   @relation(fields: [mediaId], references: [id])
}

model Banner {
  id        Int      @id @default(autoincrement())
  title     String
  image     String?
  mediaId   Int?     @map("media_id")
  media     Media?   @relation(fields: [mediaId], references: [id])
}
```

---

## 2. Legacy Column Deprecation Policy
- **Legacy Columns:** `product.images`, `product.heroImage`, `setting.value`, `banner.image`.
- **Policy:** Columns will remain in PostgreSQL schema as deprecated nullable fields during go-live to preserve zero-downtime rollback capability.

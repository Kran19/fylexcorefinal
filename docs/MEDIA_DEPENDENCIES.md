# Media System Dependencies & Technical Graph — FYLEX

## 1. System Layer Dependency Graph

```
[React Admin Pages / Components]
              │
              ▼
    [MediaPickerModal]
              │
              ▼
    [useMediaLibrary Hook]
              │
              ▼
   [AdminDataContext Provider]
              │
              ▼
      [adminApi.js / GET /api/media]
              │
              ▼
    [NestJS MediaController] ◄─── JwtAuthGuard
              │
              ▼
    [NestJS MediaService]
        │              │
        ▼              ▼
[Prisma ORM]     [Filesystem: nest_/uploads/]
        │
        ▼
[PostgreSQL Database]
 (media table & FKs)
```

---

## 2. Shared Utilities & Helper Functions

- **`getFileUrl(path)`** (`next_/lib/utils.js`):
  Normalizes relative database file paths (`/uploads/123.jpg` or `123.jpg`) into absolute URLs consumable by `<img src="...">` and `<video src="...">`. Handles domain prefixes, local development fallbacks, and production reverse proxy URLs.
- **`useMediaLibrary`** (`next_/hooks/useMediaLibrary.js`):
  Custom hook managing folder state (`/`, `/products`, `/banners`), virtual path traversal, search term filtering, date sorting, and asset type filtering (`onlyImages`, `onlyVideos`).
- **`AdminDataContext`** (`next_/context/AdminDataContext.jsx`):
  Centralized React Context provider fetching and caching the master `media` array, eliminating redundant HTTP calls across route transitions.

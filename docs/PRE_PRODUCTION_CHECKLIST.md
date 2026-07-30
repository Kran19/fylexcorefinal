# Pre-Production Deployment Checklist — FYLEX

- [ ] Execute database data sync script for legacy products.
- [ ] Run full NestJS & Next.js production build (`npm run build`).
- [ ] Verify environment variables (`DATABASE_URL`, `PORT`, `NEXT_PUBLIC_API_URL`).
- [ ] Reload PM2 production process.

# Go-Live Strategy & Cutover Plan — FYLEX

## 1. Cutover Sequence

1. Put backend API into maintenance window mode (2 minutes).
2. Execute Prisma database migration and data sync.
3. Deploy updated NestJS backend & Next.js frontend builds.
4. Restart PM2 processes (`pm2 reload all`).
5. Run smoke tests across `/shop`, `/configure`, `/checkout`.

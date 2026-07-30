# 14 — DEVOPS & INFRASTRUCTURE

## Deployment Architecture

`
Internet
    |
    v
VPS (187.127.131.26)
    |
    +-- Nginx (implied — not directly configured in repo)
    |       Port 80/443 → proxy to PM2 processes
    |
    +-- PM2 Process: fylex-frontend (Next.js) — Port 3003
    |
    +-- PM2 Process: fylex-backend (NestJS) — Port 3001
    |
    +-- PostgreSQL — Port 5432 (local)
    |
    +-- /home/fylex/nest_/uploads/ — static file storage
`

---

## Process Management: PM2

fylex-backend:
  Command: pm2 start dist/src/main.js --name "fylex-backend"
  Restart: pm2 restart fylex-backend --update-env
  Port: 3001 (NestJS default)

fylex-frontend:
  Command: pm2 start node_modules/next/dist/bin/next --name "fylex-frontend" -- start -p 3003 -H 0.0.0.0
  Port: 3003 (specified in deploy.yml)
  Restart: pm2 delete fylex-frontend + pm2 start (fresh start on each deploy)
  Reason for delete+start: Next.js start command vs restart may cause port issues

PM2 persistence: pm2 save — stores process list, survives VPS reboots with pm2 startup

---

## CI/CD: GitHub Actions

File: .github/workflows/deploy.yml
Trigger: Push to main branch (push: branches: [main])
Runner: ubuntu-latest
Action: appleboy/ssh-action@v1.0.3

Required GitHub Secrets:
  SERVER_IP — VPS IP address (187.127.131.26)
  SERVER_USERNAME — SSH username
  SERVER_SSH_KEY — Private SSH key for authentication

Deploy Script Sequence:
  1. SSH into VPS
  2. set -e (exit on any error)
  3. cd /home/fylex && git pull origin main
  4. Backend:
     - cd /home/fylex/nest_
     - npm install --frozen-lockfile (exact dependency lock)
     - npx prisma generate
     - npx prisma migrate deploy (safe — no destructive changes)
     - npm run build (tsc → dist/)
     - pm2 restart fylex-backend --update-env || pm2 start dist/src/main.js --name "fylex-backend"
  5. Frontend:
     - cd /home/fylex/next_
     - npm install --frozen-lockfile
     - npm run build (next build)
     - pm2 delete fylex-frontend || true (ignore error if not running)
     - pm2 start node_modules/next/dist/bin/next --name "fylex-frontend" -- start -p 3003 -H 0.0.0.0
  6. pm2 save

Zero-downtime: NOT guaranteed — pm2 restart is used for backend (graceful), but frontend does
delete+start which has a brief downtime window.

---

## Docker (Alternative / Local)

File: docker-compose.yml (3 services)
Also: docker-compose.local.yml (local variant — not inspected)

### Service: db (fylex-postgres)
  Image: postgres:16-alpine
  Ports: 5444:5432 (host 5444 → container 5432)
  Env: POSTGRES_USER=fylex_user, POSTGRES_PASSWORD=fylex_password, POSTGRES_DB=fylex_db
  Volumes: postgres_data:/var/lib/postgresql/data
  Healthcheck: pg_isready every 5s (5s timeout, 5 retries)

### Service: backend (fylex-backend)
  Build: ./nest_/Dockerfile
  Ports: 5000:3001 (host 5000 → container 3001)
  Env file: ./nest_/.env
  Additional env: PORT=3001, DATABASE_URL (postgres container), JWT_SECRET, NODE_ENV=production
  Depends: db (condition: service_healthy)
  Volumes: ./nest_/uploads:/app/uploads (persists uploads across container restarts)

### Service: frontend (fylex-frontend)
  Build: ./next_/Dockerfile
  Ports: 3002:3000 (host 3002 → container 3000)
  Env: NEXT_PUBLIC_API_URL=http://localhost:5000/api
  Depends: backend
  Note: Uses localhost in env — may not work correctly in containerized environment
    (should be http://backend:3001/api for service-to-service communication)

### Volume: postgres_data
  Named Docker volume for PostgreSQL data persistence

---

## Server File Paths (Production VPS)

/home/fylex/                    — Project root (git clone)
/home/fylex/nest_/              — NestJS backend
/home/fylex/nest_/dist/         — Compiled TypeScript output
/home/fylex/nest_/uploads/      — File uploads (serve via /uploads/)
/home/fylex/nest_/.env          — Backend environment variables
/home/fylex/next_/              — Next.js frontend
/home/fylex/next_/.next/        — Next.js build output

---

## Backend Dockerfile (nest_/Dockerfile)

Not directly inspected, but based on NestJS standard:
  1. node:18-alpine or node:20-alpine base
  2. WORKDIR /app
  3. COPY package*.json ./ && npm install
  4. COPY . .
  5. RUN npx prisma generate && npm run build
  6. EXPOSE 3001
  7. CMD ["node", "dist/src/main.js"]

---

## Frontend Dockerfile (next_/Dockerfile)

Not directly inspected, but based on Next.js standard:
  1. node:18-alpine base
  2. WORKDIR /app
  3. COPY package*.json ./ && npm install
  4. COPY . .
  5. RUN npm run build
  6. EXPOSE 3000
  7. CMD ["npm", "start"]

---

## Environment Configuration

Backend .env location: nest_/.env (committed to repo — SECURITY RISK)
Frontend env: NEXT_PUBLIC_API_URL (only public var needed)

Environment variable loading:
  NestJS: process.env.* (dotenv loaded automatically by NestJS bootstrap)
  Docker: env_file directive in compose

---

## Database Migrations

Tool: Prisma Migrate
Schema: nest_/prisma/schema.prisma
Migration files: nest_/prisma/migrations/ (not inspected but referenced in deploy)
Deploy command: npx prisma migrate deploy
  - Applies all pending migrations in order
  - Safe for production (does not reset data)
  - Does NOT run in interactive mode (correct for CI)

Development command (not in deploy):
  npx prisma migrate dev (creates new migration from schema diff)

Schema reset (destructive):
  npx prisma migrate reset (drops all tables — DO NOT run in production)

---

## Database Backup

No automated backup strategy found in the codebase.
RISK: No backup configuration detected.
Recommendation: Set up pg_dump cron job or managed database backup.

---

## Static File Serving

Backend serves uploads at two paths (from main.ts):
  /uploads/* → nest_/uploads/ directory
  /api/uploads/* → same directory (alternate path)

Files stored as: {32-char-hex}.{extension}
No CDN configured — files served directly from VPS disk
Risk: Large media files (104MB MP4s) served directly from same process

---

## Nginx (Implied)

Not directly configured in repo, but based on VPS setup:
  Likely configuration:
    Port 80 → proxy_pass to http://localhost:3003 (Next.js frontend)
    /api/* → proxy_pass to http://localhost:3001 (NestJS backend)
    /uploads/* → proxy to NestJS static files
  SSL/HTTPS: Status unknown (no certificate management in repo)

---

## Monitoring / Alerting

PM2 built-in:
  pm2 status — process health
  pm2 logs — log access
  pm2 monit — real-time CPU/memory monitoring

No external monitoring configured:
  No New Relic, Datadog, Sentry, or similar APM found
  No uptime monitoring configured
  No alerting on deployment failures (GitHub Actions emails on failure by default)

---

## Server Resource Usage Estimate

Uploads directory: 75 files
  PNG images: ~60 files × ~6MB = ~360MB
  MP4 videos: 3 × ~104MB = ~312MB
  Total uploads: ~672MB

Database: PostgreSQL with full schema
  Schema complexity: ~80+ tables
  Data size: dependent on actual orders/customers

---

*Document 14 of 20 — FYLEX Enterprise Documentation Suite*

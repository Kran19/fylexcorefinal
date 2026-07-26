# Deployment Guide

## 1. Prerequisites
- **Server:** Ubuntu 22.04 LTS (or newer)
- **Node.js:** v20+ (Required for Next.js 16.x)
- **Database:** PostgreSQL 14+
- **Process Manager:** PM2 (`npm install -g pm2`)
- **Reverse Proxy:** Nginx

## 2. Server Initialization (One-Time Setup)

### 2.1 Directory Structure
Create the required directory on the server:
```bash
mkdir -p /home/fylex
cd /home/fylex
git clone <repository_url> .
```

### 2.2 Environment Variables
Create `.env` files for both the frontend and backend.

**Backend (`/home/fylex/nest_/.env`):**
```env
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/fylex?schema=public"
JWT_SECRET="your-super-secret-key"
```

**Frontend (`/home/fylex/next_/.env`):**
```env
NEXT_PUBLIC_API_URL="http://your-server-ip/api"
```

## 3. Deployment Process (Manual)
*Note: The platform is currently configured to deploy automatically via GitHub Actions on push to `main`.*

If a manual deployment is necessary, follow these steps on the server:

### 3.1 Deploy Backend
```bash
cd /home/fylex/nest_
npm install --frozen-lockfile
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start dist/src/main.js --name "fylex-backend"
```

### 3.2 Deploy Frontend
```bash
cd /home/fylex/next_
npm install --frozen-lockfile
npm run build
pm2 start node_modules/next/dist/bin/next --name "fylex-frontend" -- start -p 3003
```

### 3.3 Save PM2 State
```bash
pm2 save
pm2 startup
```

## 4. Nginx Configuration
Route port `80` (and `443` for SSL) to the PM2 processes.

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Static Uploads
    location /uploads {
        proxy_pass http://localhost:3001/uploads;
    }
}
```

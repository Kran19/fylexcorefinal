# CI/CD & Deployment Analysis

## 1. Overview
The FYLEX project utilizes GitHub Actions for continuous deployment. The deployment process is triggered automatically on pushes to the `main` branch. 
It uses a direct SSH approach (`appleboy/ssh-action@v1.0.3`) to execute deployment commands directly on the production server.

## 2. Infrastructure
- **Server:** Target IP `187.127.131.26`
- **Process Manager:** PM2 is used to manage both frontend and backend Node.js processes.
- **Web Server / Reverse Proxy:** Nginx is likely sitting in front of the application based on typical PM2 setups and the deployment URLs.

## 3. Deployment Flow

### 3.1 Source Retrieval
- Changes are pulled from `origin main` directly into the `/home/fylex` directory on the server.

### 3.2 Backend (NestJS) Deployment
1. Navigate to `/home/fylex/nest_`.
2. Install dependencies: `npm install --frozen-lockfile`.
3. Database Setup:
   - Run `npx prisma generate` to rebuild the Prisma client.
   - Run `npx prisma migrate deploy` to apply pending database migrations.
4. Build: `npm run build` compiles TypeScript to JavaScript.
5. Process Restart: Restarts `fylex-backend` via PM2.

### 3.3 Frontend (Next.js) Deployment
1. Navigate to `/home/fylex/next_`.
2. Install dependencies: `npm install --frozen-lockfile`.
3. Build: `npm run build` generates the production bundle (including static generation).
4. Process Restart: Deletes the existing PM2 process (`fylex-frontend`) and starts the new build on port `3003`.

### 3.4 State Persistence
- Runs `pm2 save` to persist the PM2 process list across server reboots.

## 4. Observations & Issues

### 4.1 Missing Dockerization
The deployment runs directly on the host OS. There is no Docker or Docker Compose setup. This tightly couples the application to the server environment (Node version, OS packages) and makes scaling out horizontally more difficult.

### 4.2 Zero-Downtime Deployment
The deployment script is not a true zero-downtime deployment. 
- For the backend, `pm2 restart` is used, which has minimal downtime but isn't a graceful reload.
- For the frontend, the script explicitly runs `pm2 delete fylex-frontend` followed by `pm2 start`. This guarantees a few seconds of downtime during the Next.js process startup.

### 4.3 Environment Variables
- Environment variables are assumed to be statically placed in `.env` files on the server. The workflow does not inject `.env` files securely from GitHub Secrets during the build process, which requires manual intervention on the server whenever config changes.

### 4.4 Rollback Strategy
There is no automated rollback strategy in the pipeline. If the build or migration fails, the workflow stops (`set -e`), leaving the system in a potentially inconsistent state.

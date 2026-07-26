# Security Audit

## 1. Executive Summary
**Score:** 65/100 (Fair)

The backend implements basic security hygiene (global validation, JWT), but some critical vulnerabilities exist regarding CORS, File Uploads, and infrastructure exposure.

## 2. Strengths (What's working well)
- **Global Payload Validation:** NestJS `ValidationPipe` strictly forbids non-whitelisted properties, protecting against Mass Assignment and NoSQL/SQL injection (combined with Prisma).
- **ORM Protection:** Prisma safely escapes parameters, virtually eliminating raw SQL injection vulnerabilities unless `prisma.$queryRaw` is used unsafely.
- **JWT Implementation:** Standard stateless authentication is used for both customers and admins.

## 3. Vulnerabilities & Risks

### 3.1 CORS Misconfiguration (High Risk)
In `main.ts`, CORS is configured as:
```typescript
app.enableCors({
  origin: true,
  credentials: true,
});
```
`origin: true` reflects the request origin back to the browser. Combined with `credentials: true`, this completely defeats the purpose of CORS. Any malicious website can make cross-origin requests to the API with the user's cookies/credentials, exposing the platform to Cross-Site Request Forgery (CSRF) if cookies are used for auth, or general data scraping.

### 3.2 Static Uploads Exposure (Medium Risk)
Files are served statically from `/uploads/` using Express.
- If file uploads do not strictly validate MIME types and file extensions (e.g., preventing `.js`, `.php`, `.sh`), an attacker could upload a malicious script and execute it or serve it.
- There is no authentication on `/uploads/`. Any user can view any uploaded file (e.g., private invoices, KYC documents if applicable) if they guess the URL.

### 3.3 Lack of Rate Limiting
There is no indication of `@nestjs/throttler` being configured globally. Endpoints like login, OTP generation, and checkout are vulnerable to brute-force and DDoS attacks.

### 3.4 Secrets Management
Based on the CI/CD script, secrets are stored in GitHub Actions, but the environment relies on a raw `.env` file on the server. If the server is compromised or directory traversal is achieved, database credentials and JWT secrets are exposed.

## 4. Recommendations
1. **Fix CORS:** Hardcode the specific allowed origins (e.g., `origin: ['https://fylex.com', 'https://admin.fylex.com']`).
2. **Implement Rate Limiting:** Add `@nestjs/throttler` to protect `/api/auth/*` routes.
3. **Secure Uploads:** Ensure the `media` module uses a `FileInterceptor` that strictly limits file sizes and MIME types. Migrate from local disk to AWS S3 (or similar) for better security and scalability.

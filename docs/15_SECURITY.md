# 15 — SECURITY ANALYSIS

## Overview
This document provides a factual security analysis of the FYLEX codebase
as discovered through direct code inspection. Issues are categorised by severity.

---

## CRITICAL ISSUES

### 1. OTP Hardcoded to '1234'
File: nest_/src/modules/auth/auth.service.ts (line ~62)
Code: if (otp !== '1234') return null;
Impact: Any attacker who knows a customer's mobile number can log in
  using OTP='1234'. This is publicly predictable.
  This exposes ALL customer accounts to account takeover.
Risk: CRITICAL — Complete authentication bypass for OTP login

### 2. Most API Routes Completely Unprotected
Finding: Only GET /auth/me has JwtAuthGuard applied.
  All order, payment, customer, admin, CMS, media, settings routes have no auth guard.
Impact:
  - Attacker can update any order status without admin token
  - Attacker can delete products, modify settings, access CMS without authentication
  - Attacker can enumerate all customer orders
  - Attacker can delete media files, modify banners
  - Any user can call /admin/* backend routes without authentication
Risk: CRITICAL — Entire backend API is effectively unauthenticated

### 3. Live Razorpay Keys Committed to Repository
File: nest_/.env
Values: RAZORPAY_KEY_ID=rzp_live_*, RAZORPAY_KEY_SECRET=*
Impact: Anyone with repository access can make API calls charged to FYLEX Razorpay account.
  If repo is public or ever leaked: financial fraud risk.
Risk: CRITICAL

---

## HIGH SEVERITY ISSUES

### 4. Weak JWT Secret
File: nest_/.env
Value: JWT_SECRET=fylex_secret_key_123
Impact: JWT tokens can be forged if secret is brute-forced or guessed.
  Common, short secrets are vulnerable to dictionary attacks.
Risk: HIGH

### 5. No Rate Limiting
Finding: No rate limiting middleware detected on any endpoint.
Impact:
  - Login endpoint susceptible to brute force attacks
  - OTP endpoint susceptible to brute force (trivially — OTP is '1234')
  - Payment endpoint can be spam-called
  - No DDoS protection at application layer
Risk: HIGH

### 6. Shiprocket Credentials Committed to Repository
File: nest_/.env
Values: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD
Impact: Attacker can authenticate as FYLEX on Shiprocket, create/cancel shipments,
  expose customer addresses, interfere with logistics.
Risk: HIGH

### 7. Invoice Access Without Authentication
File: nest_/src/modules/order/order.controller.ts (lines 47-73)
Code: @UseGuards(JwtAuthGuard) — COMMENTED OUT
Impact: Any user who knows an order ID can access any customer's invoice
  including billing address, items, amounts, personal details.
Risk: HIGH — PII exposure

### 8. Customer Order Access Without Ownership Check
Finding: GET /orders?customerId=X — any caller can pass any customerId.
  No validation that the requester owns the requested orders.
Impact: Customer A can see Customer B's orders by knowing their customerId.
Risk: HIGH — PII / data isolation breach

---

## MEDIUM SEVERITY ISSUES

### 9. JWT Tokens in localStorage (Not HttpOnly Cookies)
Finding: Tokens stored in localStorage('fylexx_token') and localStorage('admin_token')
Impact: Vulnerable to XSS attacks — malicious JS can steal the token.
  HttpOnly cookies are immune to JS-based theft.
Risk: MEDIUM

### 10. CORS Set to origin: true (Accept All Origins)
Finding: CORS enabled with origin: true, credentials: true
Impact: Any website can make credentialed cross-origin requests to the API.
Risk: MEDIUM — Depends on token-in-localStorage (not cookies) so CSRF risk is limited,
  but still allows cross-site data leakage.

### 11. Admin Panel No Server-Side Auth Enforcement
Finding: Admin routes (/admin/*) rely on client-side redirect if no admin_token.
  No server-side middleware validates admin access.
Impact: The admin UI is a client-side guard only — backend routes are still open.
Risk: MEDIUM (HIGH combined with issue #2)

### 12. No CSRF Protection
Finding: No CSRF tokens or SameSite cookie configuration found.
Impact: If cookies were used (they're not currently), CSRF would be a direct risk.
  With localStorage, direct CSRF is mitigated but XSS-to-CSRF chain is possible.
Risk: MEDIUM

### 13. dangerouslySetInnerHTML Without Sanitization
Finding: CMS content fields (rich text in pages, banners) stored as raw HTML.
  Frontend renders with dangerouslySetInnerHTML (standard Next.js pattern).
  No DOMPurify or sanitization library detected.
Impact: If attacker can modify CMS content (via unprotected API), can inject XSS.
Risk: MEDIUM (escalated by issue #2)

### 14. Multer 200MB File Size Limit
Finding: POST /media/upload allows files up to 200MB, up to 500 files per request.
  No authentication required to upload.
Impact: Unauthenticated attacker can fill server disk by uploading large files.
Risk: MEDIUM

---

## LOW SEVERITY ISSUES

### 15. Password in .env Not Encrypted
Finding: Database password, Shiprocket password in plaintext in .env
Standard practice for .env files, but should never be committed to version control.
Risk: LOW (if repo is private) / HIGH (if repo is public or leaked)

### 16. No Content Security Policy (CSP)
Finding: No CSP headers configured in NestJS or Nginx.
Impact: No protection against script injection.
Risk: LOW-MEDIUM

### 17. BigInt Prototype Modification
File: nest_/src/main.ts
Code: (BigInt.prototype as any).toJSON = function() { ... }
Impact: Modifies built-in prototype — can cause subtle bugs in edge cases.
Risk: LOW

---

## Positive Security Implementations

### Razorpay Signature Verification (CORRECT)
HMAC-SHA256 verification prevents payment ID spoofing.
Server calculates amount — frontend cannot manipulate price.

### bcrypt Password Hashing (CORRECT)
Passwords stored as bcrypt hashes. Never stored in plaintext.

### Prisma ORM (CORRECT)
Parameterized queries throughout — SQL injection not possible.

### ValidationPipe with whitelist (CORRECT)
Strips extra/unexpected fields from all request bodies.
forbidNonWhitelisted: true throws on unexpected fields.

### Response Standardization (GOOD)
All responses wrapped in { success, data, error } — no raw DB errors exposed.

---

## Security Recommendations (Priority Order)

1. IMMEDIATE: Replace OTP '1234' with actual SMS OTP service (Twilio, MSG91)
2. IMMEDIATE: Rotate Razorpay live keys — remove from .env, use secrets manager
3. IMMEDIATE: Add JwtAuthGuard to all admin endpoints + ownership checks
4. URGENT: Replace JWT secret with cryptographically strong random string
5. URGENT: Add rate limiting (NestJS Throttler module)
6. URGENT: Require authentication for /media/upload
7. HIGH: Restore JwtAuthGuard on invoice endpoint
8. HIGH: Add ownership validation on order access
9. MEDIUM: Consider HttpOnly cookies for JWT storage
10. MEDIUM: Restrict CORS to specific domains
11. MEDIUM: Add DOMPurify for CMS HTML content sanitization
12. MEDIUM: Add file size/type validation per upload type (images vs videos)

---

*Document 15 of 20 — FYLEX Enterprise Documentation Suite*

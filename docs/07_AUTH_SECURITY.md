# 07 — AUTHENTICATION & AUTHORIZATION

## Authentication Strategy
Library: Passport.js with @nestjs/passport
Strategy: JWT (passport-jwt)
Token format: Bearer JWT in Authorization header

---

## JWT Configuration

JWT Payload structure:
  { email: string, sub: string (userId), role: 'customer' | 'admin' }

JWT Secret: process.env.JWT_SECRET = 'fylex_secret_key_123'
RISK: Weak, predictable secret. Should be replaced with a cryptographically strong random string (>=32 chars).

Token storage (frontend):
  Customer token: localStorage.getItem('fylexx_token')
  Admin token: localStorage.getItem('admin_token') || localStorage.getItem('token')
RISK: localStorage is vulnerable to XSS. HttpOnly cookies would be safer.

---

## Endpoints (Auth Module)

### Customer Registration: POST /api/auth/register
- Validates email uniqueness against customers table
- Hashes password with bcrypt (default salt rounds)
- Creates customer record
- Auto-logs in by calling login() function

### Customer Login (Email): POST /api/auth/login
- Validates against customers table ONLY (admins cannot login as customers)
- bcrypt.compare(password, hash)
- Returns { access_token, user }

### Customer Login (OTP): POST /api/auth/login-otp
- CRITICAL SECURITY ISSUE: OTP hardcoded to '1234'
  if (otp !== '1234') return null;
- Allows any customer with OTP='1234' to login to any registered mobile
- Must be replaced with actual OTP service (Twilio, MSG91, etc.)

### Admin Login: POST /api/auth/admin/login
- Validates against admins table
- Returns { access_token, user: { role: 'admin' } }

### Get Current User: GET /api/auth/me
- Protected by JwtAuthGuard
- Reads userId and role from JWT payload
- Fetches fresh user data from DB (either customers or admins based on role)

### Forgot Password: POST /api/auth/forgot-password
- Generates crypto.randomBytes(32).toString('hex') token
- Stores in password_reset_tokens with expiry
- Sends email via Nodemailer
- Email sender configuration: process.env.SMTP_* (exact vars not in inspected .env)

### Reset Password: POST /api/auth/reset-password
- Validates reset token from password_reset_tokens
- Updates customer.password (bcrypt hash)
- Clears reset token

---

## Guards

### JwtAuthGuard (modules/auth/guards/jwt-auth.guard.ts)
- Extends AuthGuard('jwt') from @nestjs/passport
- Invoked with @UseGuards(JwtAuthGuard)
- Current usage in backend:
    GET /auth/me — PROTECTED
    GET /orders/:id/invoice — GUARD COMMENTED OUT
    Other order routes — NO guard applied (open access by customerId)

IMPORTANT NOTE: The vast majority of backend routes have NO authentication guard.
  - POST /orders — open, requires only customerId in body
  - GET /orders — open
  - PUT /orders/:id/status — open (admin function, no guard)
  - DELETE /orders/:id — open
  - POST /payments/create-order — open
  - All media endpoints — open
  - All CMS endpoints — open
  - All system endpoints — open
  This represents a significant security gap in the production system.

---

## Password Security

Hashing: bcrypt v6.0.0
Salt rounds: default (typically 10)
Comparison: bcrypt.compare(providedPassword, storedHash)

Password reset:
  - Token: crypto.randomBytes(32).toString('hex')
  - Stored in password_reset_tokens table
  - Expiry: enforced in service logic (exact duration requires inspection of auth.service.ts lines 80+)

Password change tracking:
  - admins table has passwordChangedAt column
  - password_histories table tracks hash history (prevent reuse)

---

## User Data Sanitization

sanitizeUser() method in AuthService:
  - Removes 'password' field from returned user object
  - Converts all numeric fields to strings
  - Adds 'role' field to returned object
  Result: user object safe for JWT payload and API response

---

## Session / Token Management

Customer:
  - Token: localStorage('fylexx_token')
  - User data: localStorage('fylexx_user') — redundant cache
  - Guest ID: localStorage('fylexx_guest_id') — persistent UUID for guest cart
  - Session validity: verified by GET /auth/me on every app boot
  - Expiry: JWT expiry enforced on server; no client-side expiry check

Admin:
  - Token: localStorage('admin_token')
  - No session verification on page load detected

Token refresh: NOT IMPLEMENTED — no refresh token mechanism exists.
On expiry: customer is logged out via AUTH_EXPIRED event.

---

## Authorization

### Current Implementation
Two roles exist in JWT: 'customer' and 'admin'
Role enforcement:
  - GET /auth/me routes user to correct DB table (customer or admin) based on role
  - Customer routes: no guard — open to anyone with customerId
  - Admin routes: no guard on most endpoints — open to anyone with admin_token
  - No route-level RBAC implemented

### Known Authorization Gaps
1. Most API routes are completely unprotected
2. Any customer can access any other customer's orders using their customerId
3. Admin endpoints (order status update, delete) are accessible without admin token
4. Media upload, CMS management — no auth required
5. System settings — no auth required
6. User deletion — no auth required

### Admin RBAC (Schema Only)
The admins table has a 'role' column — no values beyond 'admin' used.
No middleware enforces admin-only access to admin endpoints.

---

## Security Posture Summary

| Area | Status | Risk |
|---|---|---|
| Password hashing | bcrypt (GOOD) | LOW |
| JWT secret | 'fylex_secret_key_123' (WEAK) | HIGH |
| JWT storage | localStorage (NOT IDEAL) | MEDIUM |
| OTP validation | Hardcoded '1234' | CRITICAL |
| Razorpay keys | Committed in .env (LIVE keys) | HIGH |
| Route protection | Most routes unprotected | CRITICAL |
| Admin auth | No enforcement on most routes | HIGH |
| Token refresh | Not implemented | MEDIUM |
| HttpOnly cookies | Not used | MEDIUM |
| CSRF protection | Not detected | MEDIUM |
| Rate limiting | Not detected | HIGH |
| Input validation | ValidationPipe (GOOD) | LOW |
| CORS | origin: true (permissive) | MEDIUM |
| SQL injection | Prisma ORM prevents (GOOD) | LOW |
| XSS prevention | No specific sanitization found | MEDIUM |

---

## Email Service (Nodemailer)

Used in: authService.forgotPassword()
Configuration: process.env.SMTP_* variables
Transport: SMTP (exact provider not in inspected .env)
Emails sent: password reset link

---

## Guest User Flow

Guest ID: Generated on first visit
  gid = gst__
  Stored: localStorage('fylexx_guest_id')

Guest cart: cart items associated with sessionId = guestId
Cart merge: when guest logs in, cart is merged (implemented in cart service)

---

*Document 07 of 20 — FYLEX Enterprise Documentation Suite*

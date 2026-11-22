import { HttpStatus } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

// Periodic cleanup to prevent unbounded memory growth under DDoS
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets.entries()) {
    if (now >= b.resetAt) {
      buckets.delete(key);
    }
  }
}, 60_000).unref?.();

function getClientIp(req: any): string {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp.trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function resolveTier(method: string, path: string): { tier: string; max: number; windowMs: number } | null {
  // Static media / uploads should stream freely via browser cache
  if (path.startsWith('/uploads') || path.startsWith('/api/uploads')) {
    return null;
  }

  // Verified server-to-server webhook & Magic Checkout dynamic callbacks: high burst allowance
  if (
    path.includes('/payments/magic/webhook') ||
    path.includes('/payments/magic/shipping-info') ||
    path.includes('/payments/magic/promotions') ||
    path.includes('/payments/magic/apply-promotion') ||
    path.includes('/orders/shiprocket-webhook') ||
    path.includes('/orders/tracking-update') ||
    path.includes('/orders/webhook-listener') ||
    path.includes('/orders/status-update')
  ) {
    return { tier: 'webhook', max: 300, windowMs: 60_000 };
  }

  // Tier 1: WhatsApp OTP & Password Reset Dispatch (strict anti-bombing limit)
  if (method === 'POST' && (path.endsWith('/auth/send-otp') || path.endsWith('/auth/forgot-password'))) {
    return { tier: 'otp_dispatch', max: 5, windowMs: 10 * 60_000 };
  }

  // Tier 2: Login, OTP Verification, Admin Login & Registration (anti-brute-force)
  if (
    method === 'POST' &&
    (path.endsWith('/auth/login') ||
      path.endsWith('/auth/login-otp') ||
      path.endsWith('/auth/admin/login') ||
      path.endsWith('/auth/register') ||
      path.endsWith('/auth/reset-password') ||
      path.endsWith('/auth/check-mobile'))
  ) {
    return { tier: 'auth_verify', max: 12, windowMs: 15 * 60_000 };
  }

  // Tier 3: Order & Payment Creation (anti-checkout/inventory spam)
  if (
    method === 'POST' &&
    (path === '/api/orders' ||
      path.endsWith('/payments/create-order') ||
      path.endsWith('/payments/magic/create-order') ||
      path.endsWith('/payments/magic/complete-free'))
  ) {
    return { tier: 'checkout_create', max: 25, windowMs: 5 * 60_000 };
  }

  // Tier 4: General Write Mutations (POST/PUT/PATCH/DELETE)
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    return { tier: 'api_write', max: 120, windowMs: 60_000 };
  }

  // Tier 5: General Read API Baseline
  return { tier: 'api_read', max: 300, windowMs: 60_000 };
}

export function rateLimitMiddleware(req: any, res: any, next: any) {
  if (req.method === 'OPTIONS') return next();

  const path = (req.originalUrl || req.url || '').split('?')[0];
  const rule = resolveTier(req.method, path);
  if (!rule) return next();

  const ip = getClientIp(req);
  const key = `${rule.tier}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      const firstKey = buckets.keys().next().value;
      if (firstKey) buckets.delete(firstKey);
    }
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, rule.max - bucket.count);
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  res.setHeader('X-RateLimit-Limit', String(rule.max));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (bucket.count > rule.max) {
    res.setHeader('Retry-After', String(retryAfterSec));
    return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: `Too many requests. Please wait ${retryAfterSec} seconds and try again.`,
      error: 'Too Many Requests',
    });
  }

  next();
}

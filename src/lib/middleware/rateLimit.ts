import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30');
const MAX_AUTH_REQUESTS = 5;
const MAX_LOGIN_REQUESTS = 10;

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { maxRequests: MAX_LOGIN_REQUESTS, windowMs: 5 * 60 * 1000 },
  '/api/auth/register': { maxRequests: MAX_AUTH_REQUESTS, windowMs: 15 * 60 * 1000 },
  '/api/orders': { maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS },
  '/api/cart': { maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS },
  '/api/stock': { maxRequests: 20, windowMs: 60 * 1000 },
  '/api/admin': { maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS },
};

function cleanStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfIP = req.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  return 'unknown';
}

export function rateLimit(req: NextRequest): { success: boolean; remaining: number; resetIn: number } {
  cleanStore();
  
  const path = req.nextUrl.pathname;
  const ip = getClientIP(req);
  const key = `${ip}:${path}`;
  const now = Date.now();
  
  const routeConfig = Object.entries(ROUTE_LIMITS)
    .filter(([route]) => path.startsWith(route))
    .sort((a, b) => b[0].length - a[0].length)[0];
  
  const config = routeConfig ? routeConfig[1] : { maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS };
  const { maxRequests, windowMs } = config;
  
  const entry = store.get(key);
  
  if (!entry || now > entry.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + windowMs,
      firstRequestTime: now
    });
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }
  
  entry.count++;
  
  if (entry.count > maxRequests) {
    const resetIn = entry.resetTime - now;
    return { success: false, remaining: 0, resetIn };
  }
  
  const resetIn = entry.resetTime - now;
  return { success: true, remaining: maxRequests - entry.count, resetIn };
}

export function rateLimitResponse(remaining: number, resetIn: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetIn / 1000).toString(),
        'Retry-After': Math.ceil(resetIn / 1000).toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    }
  );
}

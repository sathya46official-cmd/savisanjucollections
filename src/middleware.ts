import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.NEXT_PUBLIC_DOMAIN || '';
  const baseUrl = isProduction ? `https://${domain}` : 'http://localhost:3000';

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data:`,
      `connect-src 'self' ${baseUrl} https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return response;
}

/**
 * Verify JWT token by calling backend
 */
async function verifyAuth(request: NextRequest): Promise<{ valid: boolean; role?: string; userId?: string }> {
  try {
    // Get auth cookie
    const authToken = request.cookies.get('auth_token');
    
    if (!authToken) {
      return { valid: false };
    }

    // Verify token with backend
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Cookie': `auth_token=${authToken.value}`
      }
    });

    if (!response.ok) {
      return { valid: false };
    }

    const data = await response.json();
    return {
      valid: true,
      role: data.role,
      userId: data.userId
    };

  } catch (error) {
    console.error('Auth verification error:', error);
    return { valid: false };
  }
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes - require admin role
  if (pathname.startsWith('/admin')) {
    const auth = await verifyAuth(request);

    if (!auth.valid) {
      // Not authenticated - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }

    if (auth.role !== 'admin') {
      // Not admin - redirect to home with error
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Admin authenticated - allow
    return addSecurityHeaders(NextResponse.next());
  }

  // Protected user routes - require authentication
  if (pathname.startsWith('/orders') || pathname.startsWith('/checkout')) {
    const auth = await verifyAuth(request);

    if (!auth.valid) {
      // Not authenticated - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }

    // Authenticated - allow
    return addSecurityHeaders(NextResponse.next());
  }

  // Public routes - allow
  return addSecurityHeaders(NextResponse.next());
}

/**
 * Matcher configuration
 * Only run middleware on specific paths
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/orders/:path*',
    '/checkout/:path*'
  ]
};

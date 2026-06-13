import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// NOTE: All security headers (CSP, HSTS, X-Frame-Options, nosniff, etc.) are set
// globally in next.config.ts `headers()` so they apply to every route. This
// middleware is responsible only for authentication/authorization redirects.

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
      return NextResponse.redirect(url);
    }

    if (auth.role !== 'admin') {
      // Not admin - redirect to home
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Admin authenticated - allow
    return NextResponse.next();
  }

  // Protected user routes - require authentication
  if (pathname.startsWith('/orders') || pathname.startsWith('/checkout')) {
    const auth = await verifyAuth(request);

    if (!auth.valid) {
      // Not authenticated - redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Authenticated - allow
    return NextResponse.next();
  }

  // Public routes - allow
  return NextResponse.next();
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

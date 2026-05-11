import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function addSecurityHeaders(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  const domain = request.headers.get('host') || '';
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? `https://${domain}` : 'http://localhost:3000';

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${isProduction ? '' : "'unsafe-eval'"}`,
      `style-src 'self' 'unsafe-inline' ${isProduction ? '' : "'unsafe-inline'"}`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data:`,
      `connect-src 'self' ${baseUrl} https://*.supabase.co wss://*.supabase.co`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');

  return response;
}

export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i,
      /credential/i,
      /connection[_-]?string/i,
      /database/i,
      /postgres/i,
      /mysql/i,
      /redis/i,
      /jwt/i,
      /authorization/i,
      /bearer/i,
      /session/i,
      /cookie/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'An internal error occurred. Please contact support if this persists.';
      }
    }

    if (message.includes('SQL') || message.includes('database')) {
      return 'A database error occurred. Please try again later.';
    }

    if (message.includes('ENOENT') || message.includes('file') || message.includes('path')) {
      return 'A file error occurred. Please try again later.';
    }

    return message.length > 200 ? message.slice(0, 200) + '...' : message;
  }
  
  return 'An unexpected error occurred.';
}

export function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({
    timestamp,
    type: 'SECURITY',
    event,
    ...details,
  });
  
  if (process.env.NODE_ENV === 'production') {
    console.error(logEntry);
  }
}
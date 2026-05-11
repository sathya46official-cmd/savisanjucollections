import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.COOKIE_SECRET || 'fallback-secret-change-in-production'
);
const JWT_EXPIRATION = '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

function isValidRole(role: unknown): role is 'user' | 'admin' {
  return role === 'user' || role === 'admin';
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  if (!payload.userId || !payload.email || !isValidRole(payload.role)) {
    throw new Error('Invalid payload for JWT');
  }

  return new SignJWT({ 
    userId: payload.userId, 
    email: payload.email, 
    role: payload.role 
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .setIssuer('savisanju-frontend')
    .setAudience(['savisanju-api'])
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'savisanju-frontend',
      audience: ['savisanju-api']
    });

    if (!isValidRole(payload.role)) {
      return null;
    }

    return {
      userId: String(payload.userId),
      email: String(payload.email),
      role: payload.role,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.savisanju.com' : undefined
  });
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || null;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return verifyJWT(token);
}

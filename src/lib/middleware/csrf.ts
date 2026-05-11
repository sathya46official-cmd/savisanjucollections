import { NextRequest } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET = process.env.CSRF_SECRET || randomBytes(32).toString('hex');

interface CSRFTokenEntry {
  token: string;
  createdAt: number;
}

const csrfTokens = new Map<string, CSRFTokenEntry>();
const TOKEN_TTL_MS = 60 * 60 * 1000;
const MAX_TOKENS = 1000;

function cleanOldTokens(): void {
  const now = Date.now();
  for (const [key, entry] of csrfTokens.entries()) {
    if (now - entry.createdAt > TOKEN_TTL_MS) {
      csrfTokens.delete(key);
    }
  }
  if (csrfTokens.size > MAX_TOKENS) {
    const entries = Array.from(csrfTokens.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)
      .slice(0, MAX_TOKENS);
    csrfTokens.clear();
    entries.forEach(([k, v]) => csrfTokens.set(k, v));
  }
}

function createSignedToken(raw: string): string {
  const hmac = require('crypto').createHmac('sha256', CSRF_SECRET);
  hmac.update(raw);
  return `${raw}.${hmac.digest('hex').slice(0, 16)}`;
}

function verifySignedToken(signed: string): string | null {
  const parts = signed.split('.');
  if (parts.length !== 2) return null;
  const [raw, expectedSig] = parts;
  const hmac = require('crypto').createHmac('sha256', CSRF_SECRET);
  hmac.update(raw);
  const actualSig = hmac.digest('hex').slice(0, 16);
  if (!timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig))) return null;
  return raw;
}

export function generateCSRFToken(): string {
  cleanOldTokens();
  const raw = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const signed = createSignedToken(raw);
  const entry: CSRFTokenEntry = { token: signed, createdAt: Date.now() };
  csrfTokens.set(raw, entry);
  setTimeout(() => csrfTokens.delete(raw), TOKEN_TTL_MS);
  return signed;
}

export function validateCSRFToken(req: NextRequest): boolean {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  if (!origin) return false;

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const isAllowedOrigin = allowedOrigins.some(o => origin.startsWith(o));
  if (!isAllowedOrigin) return false;

  const signedToken = req.headers.get('x-csrf-token');
  if (!signedToken) return false;

  const raw = verifySignedToken(signedToken);
  if (!raw) return false;

  const entry = csrfTokens.get(raw);
  if (!entry) return false;

  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    csrfTokens.delete(raw);
    return false;
  }

  return true;
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { GET as verifyEmailGET } from '@/app/api/auth/verify-email/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Integration Test: Complete User Registration Flow
 * 
 * Tests the end-to-end user registration flow:
 * 1. Register new user with valid data
 * 2. Verify email verification sent
 * 3. Click verification link
 * 4. Verify email_verified=true in database
 * 5. Login with credentials
 * 6. Verify JWT token in httpOnly cookie
 * 
 * Requirements: 2.28, 2.68
 * 
 * **Validates: Requirements 2.28, 2.68**
 */

// Mock dependencies
let mockUserData: any = null;
let mockEmailSent = false;
let mockAuthCookieSet = false;
let mockAuthCookieValue = '';

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => {
                if (mockUserData) {
                  return { data: mockUserData, error: null };
                }
                return { data: null, error: null };
              })
            }))
          })),
          insert: vi.fn((data: any) => {
            mockUserData = { ...data, email_verified: false };
            return { error: null };
          }),
          update: vi.fn((data: any) => {
            if (mockUserData) {
              mockUserData = { ...mockUserData, ...data };
            }
            return {
              eq: vi.fn(() => ({ error: null }))
            };
          })
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null }))
          }))
        }))
      };
    }),
    auth: {
      admin: {
        createUser: vi.fn((userData: any) => ({
          data: {
            user: {
              id: 'test-user-id-123',
              email: userData.email,
              user_metadata: userData.user_metadata
            }
          },
          error: null
        })),
        deleteUser: vi.fn()
      },
      signInWithPassword: vi.fn((credentials: any) => {
        // Simulate successful login if user exists and email is verified
        if (mockUserData && mockUserData.email === credentials.email && mockUserData.email_verified) {
          return {
            data: {
              user: {
                id: mockUserData.id,
                email: mockUserData.email
              }
            },
            error: null
          };
        }
        return {
          data: null,
          error: { message: 'Invalid credentials' }
        };
      })
    }
  }
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 99 })),
  rateLimitResponse: vi.fn()
}));

vi.mock('@/lib/email/resend', () => ({
  sendVerificationEmail: vi.fn((email: string, userId: string) => {
    mockEmailSent = true;
    return Promise.resolve();
  })
}));

vi.mock('@/lib/auth/jwt', () => ({
  signJWT: vi.fn((payload: any) => {
    return Promise.resolve('mock-jwt-token-' + payload.userId);
  }),
  setAuthCookie: vi.fn((token: string) => {
    mockAuthCookieSet = true;
    mockAuthCookieValue = token;
    return Promise.resolve();
  }),
  verifyJWT: vi.fn((token: string) => {
    if (token.startsWith('mock-jwt-token-')) {
      return Promise.resolve({
        userId: token.replace('mock-jwt-token-', ''),
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 86400000
      });
    }
    return Promise.resolve(null);
  })
}));

describe('Integration Test: Complete User Registration Flow', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockUserData = null;
    mockEmailSent = false;
    mockAuthCookieSet = false;
    mockAuthCookieValue = '';
  });

  afterEach(() => {
    // Clean up after each test
    mockUserData = null;
    mockEmailSent = false;
    mockAuthCookieSet = false;
    mockAuthCookieValue = '';
  });

  it('should complete the full user registration flow: register → verify email → login', async () => {
    // Step 1: Register new user with valid data
    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        password: 'SecurePass123'
      })
    });

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    // Verify registration was successful
    expect(registerResponse.status).toBe(201);
    expect(registerData.message).toContain('Registration successful');
    expect(registerData.message).toContain('check your email');

    // Step 2: Verify email verification was sent
    expect(mockEmailSent).toBe(true);
    expect(mockUserData).not.toBeNull();
    expect(mockUserData.email).toBe('test@example.com');
    expect(mockUserData.name).toBe('Test User');
    expect(mockUserData.email_verified).toBe(false);

    // Step 3: Click verification link (simulate email verification)
    // Use a valid UUID format for the verification token
    const verificationToken = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'; // This would be the user ID sent in the email
    
    // Update mockUserData to use this UUID
    mockUserData.id = verificationToken;
    
    const verifyRequest = new NextRequest(
      `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`,
      { method: 'GET' }
    );

    const verifyResponse = await verifyEmailGET(verifyRequest);
    const verifyData = await verifyResponse.json();

    // Verify email verification was successful
    expect(verifyResponse.status).toBe(200);
    expect(verifyData.verified).toBe(true);
    expect(verifyData.message).toContain('Email verified successfully');

    // Step 4: Verify email_verified=true in database
    expect(mockUserData.email_verified).toBe(true);

    // Step 5: Login with credentials
    const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123'
      })
    });

    const loginResponse = await loginPOST(loginRequest);
    const loginData = await loginResponse.json();

    // Verify login was successful
    expect(loginResponse.status).toBe(200);
    expect(loginData.message).toBe('Login successful');
    expect(loginData.user).toBeDefined();
    expect(loginData.user.email).toBe('test@example.com');

    // Step 6: Verify JWT token in httpOnly cookie
    expect(mockAuthCookieSet).toBe(true);
    expect(mockAuthCookieValue).toContain('mock-jwt-token-');
    expect(mockAuthCookieValue).toContain(verificationToken);
  });

  it('should reject registration with invalid email format', async () => {
    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email-format',
        phone: '9876543210',
        password: 'SecurePass123'
      })
    });

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    expect(registerResponse.status).toBe(400);
    expect(registerData.error).toBe('Validation failed');
    expect(mockEmailSent).toBe(false);
  });

  it('should reject registration with weak password', async () => {
    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        password: 'weak'
      })
    });

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    expect(registerResponse.status).toBe(400);
    expect(registerData.error).toBe('Validation failed');
    expect(mockEmailSent).toBe(false);
  });

  it('should reject registration with invalid phone number', async () => {
    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '123', // Too short
        password: 'SecurePass123'
      })
    });

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    expect(registerResponse.status).toBe(400);
    expect(registerData.error).toBe('Validation failed');
    expect(mockEmailSent).toBe(false);
  });

  it('should reject email verification with invalid token format', async () => {
    const verifyRequest = new NextRequest(
      'http://localhost:3000/api/auth/verify-email?token=invalid-token-format',
      { method: 'GET' }
    );

    const verifyResponse = await verifyEmailGET(verifyRequest);
    const verifyData = await verifyResponse.json();

    expect(verifyResponse.status).toBe(400);
    expect(verifyData.error).toContain('Invalid verification token format');
  });

  it('should reject email verification with missing token', async () => {
    const verifyRequest = new NextRequest(
      'http://localhost:3000/api/auth/verify-email',
      { method: 'GET' }
    );

    const verifyResponse = await verifyEmailGET(verifyRequest);
    const verifyData = await verifyResponse.json();

    expect(verifyResponse.status).toBe(400);
    expect(verifyData.error).toContain('Verification token is required');
  });

  it('should handle already verified email gracefully', async () => {
    // First, register and verify a user
    const verificationToken = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    mockUserData = {
      id: verificationToken,
      email: 'test@example.com',
      name: 'Test User',
      email_verified: true
    };

    const verifyRequest = new NextRequest(
      `http://localhost:3000/api/auth/verify-email?token=${verificationToken}`,
      { method: 'GET' }
    );

    const verifyResponse = await verifyEmailGET(verifyRequest);
    const verifyData = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(verifyData.alreadyVerified).toBe(true);
    expect(verifyData.message).toContain('Email already verified');
  });

  it('should reject login with invalid credentials', async () => {
    const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123'
      })
    });

    const loginResponse = await loginPOST(loginRequest);
    const loginData = await loginResponse.json();

    expect(loginResponse.status).toBe(401);
    expect(loginData.error).toBe('Invalid credentials');
    expect(mockAuthCookieSet).toBe(false);
  });

  it('should enforce rate limiting on registration', async () => {
    // Mock rate limit exceeded
    const { rateLimit, rateLimitResponse } = await import('@/lib/middleware/rateLimit');
    vi.mocked(rateLimit).mockReturnValueOnce({ success: false, remaining: 0 });
    vi.mocked(rateLimitResponse).mockReturnValueOnce(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    );

    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        password: 'SecurePass123'
      })
    });

    const registerResponse = await registerPOST(registerRequest);

    // Rate limit should prevent registration
    expect(registerResponse.status).toBe(429);
    expect(mockEmailSent).toBe(false);
  });

  it('should enforce rate limiting on login', async () => {
    // Mock rate limit exceeded
    const { rateLimit, rateLimitResponse } = await import('@/lib/middleware/rateLimit');
    vi.mocked(rateLimit).mockReturnValueOnce({ success: false, remaining: 0 });
    vi.mocked(rateLimitResponse).mockReturnValueOnce(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    );

    const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123'
      })
    });

    const loginResponse = await loginPOST(loginRequest);

    // Rate limit should prevent login
    expect(loginResponse.status).toBe(429);
    expect(mockAuthCookieSet).toBe(false);
  });

  it('should validate all required fields in registration', async () => {
    const registerRequest = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        // Missing name
        email: 'test@example.com',
        phone: '9876543210',
        password: 'SecurePass123'
      })
    });

    const registerResponse = await registerPOST(registerRequest);
    const registerData = await registerResponse.json();

    expect(registerResponse.status).toBe(400);
    expect(registerData.error).toBe('Validation failed');
    expect(mockEmailSent).toBe(false);
  });

  it('should validate all required fields in login', async () => {
    const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        // Missing password
        email: 'test@example.com'
      })
    });

    const loginResponse = await loginPOST(loginRequest);
    const loginData = await loginResponse.json();

    expect(loginResponse.status).toBe(400);
    expect(loginData.error).toBe('Validation failed');
    expect(mockAuthCookieSet).toBe(false);
  });
});

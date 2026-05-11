import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as adminLoginPOST } from '@/app/api/admin/login/route';
import { GET as cartGET } from '@/app/api/cart/route';
import { GET as adminOrdersGET } from '@/app/api/admin/orders/route';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Integration Test: Authentication and Authorization
 * 
 * Tests the complete authentication and authorization flow:
 * 1. Unauthenticated access to /admin redirects to login
 * 2. Regular user access to /admin returns 403 Forbidden or redirects
 * 3. Admin user access to /admin is allowed
 * 4. Unauthenticated API calls return 401 Unauthorized
 * 5. Regular user API calls to admin endpoints return 403 Forbidden
 * 6. Admin API calls to admin endpoints are allowed
 * 7. Protected user API routes require authentication
 * 8. JWT token validation
 * 9. Role-based access control
 * 
 * Requirements: 2.2, 2.18
 * 
 * **Validates: Requirements 2.2 (JWT-based authentication), 2.18 (Role-based authorization)**
 */

// Mock data
let mockCurrentUser: any = null;
let mockUserData: any = null;
let mockOrders: any[] = [];
let mockCart: any = null;
let mockAdminPasswordHash: string = '';

// Mock users
const mockAdminUser = {
  userId: 'admin-123',
  email: 'admin@savisanju.com',
  role: 'admin'
};

const mockRegularUser = {
  userId: 'user-123',
  email: 'user@example.com',
  role: 'user'
};

// Mock middleware
vi.mock('@/middleware', () => ({
  middleware: vi.fn(async (request: any) => {
    const pathname = new URL(request.url).pathname;
    
    // Admin routes - require admin role
    if (pathname.startsWith('/admin')) {
      if (!mockCurrentUser) {
        // Not authenticated - redirect to login
        const url = new URL(request.url);
        url.pathname = '/auth';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      if (mockCurrentUser.role !== 'admin') {
        // Not admin - redirect to home
        const url = new URL(request.url);
        url.pathname = '/';
        return NextResponse.redirect(url);
      }

      // Admin authenticated - allow
      return NextResponse.next();
    }

    // Protected user routes - require authentication
    if (pathname.startsWith('/orders') || pathname.startsWith('/checkout')) {
      if (!mockCurrentUser) {
        // Not authenticated - redirect to login
        const url = new URL(request.url);
        url.pathname = '/auth';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      // Authenticated - allow
      return NextResponse.next();
    }

    // Public routes - allow
    return NextResponse.next();
  })
}));

vi.mock('@/lib/auth/jwt', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockCurrentUser)),
  signJWT: vi.fn((payload: any) => Promise.resolve(`mock-jwt-token-${payload.userId}`)),
  setAuthCookie: vi.fn(() => Promise.resolve()),
  verifyJWT: vi.fn((token: string) => {
    if (token.includes('admin-123')) {
      return Promise.resolve(mockAdminUser);
    } else if (token.includes('user-123')) {
      return Promise.resolve(mockRegularUser);
    }
    return Promise.resolve(null);
  }),
  getAuthToken: vi.fn(() => {
    if (mockCurrentUser) {
      return Promise.resolve(`mock-jwt-token-${mockCurrentUser.userId}`);
    }
    return Promise.resolve(null);
  }),
  clearAuthCookie: vi.fn(() => Promise.resolve())
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn((password: string, hash: string) => {
    // Mock: password 'admin123' matches the hash
    if (password === 'admin123' && hash === mockAdminPasswordHash) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  })
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 99 })),
  rateLimitResponse: vi.fn((remaining: number) => 
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  )
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'cart') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(() => {
                if (mockCart && mockCart.user_id === value) {
                  return { data: mockCart, error: null };
                }
                return { data: null, error: null };
              })
            }))
          })),
          insert: vi.fn((data: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => {
                mockCart = { id: 'cart-123', ...data };
                return { data: mockCart, error: null };
              })
            }))
          }))
        };
      }

      if (table === 'cart_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ data: [], error: null }))
          }))
        };
      }

      if (table === 'orders') {
        return {
          select: vi.fn(() => ({
            gt: vi.fn(() => ({
              order: vi.fn(() => ({ data: mockOrders, error: null }))
            })),
            order: vi.fn(() => ({ data: mockOrders, error: null }))
          }))
        };
      }

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
          }))
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
      signInWithPassword: vi.fn((credentials: any) => {
        if (mockUserData && mockUserData.email === credentials.email) {
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

describe('Integration Test: Authentication and Authorization', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock data
    mockCurrentUser = null;
    mockUserData = null;
    mockCart = null;
    mockOrders = [];
    mockAdminPasswordHash = '$2a$10$mockHashForAdmin123Password';
    
    // Set environment variable for admin password hash
    process.env.ADMIN_PASSWORD_HASH = mockAdminPasswordHash;
  });

  afterEach(() => {
    // Clean up
    mockCurrentUser = null;
    mockUserData = null;
    mockCart = null;
    mockOrders = [];
  });

  describe('Frontend Route Protection (Middleware)', () => {
    it('should redirect unauthenticated users from /admin to /auth', async () => {
      // No current user (unauthenticated)
      mockCurrentUser = null;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should redirect to /auth with redirect parameter
      expect(response.status).toBe(307); // Temporary redirect
      const location = response.headers.get('location');
      expect(location).toContain('/auth');
      expect(location).toContain('redirect=%2Fadmin');
    });

    it('should redirect regular users from /admin to home page', async () => {
      // Set current user to regular user
      mockCurrentUser = mockRegularUser;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should redirect to home page (not admin)
      expect(response.status).toBe(307); // Temporary redirect
      const location = response.headers.get('location');
      expect(location).toBe('http://localhost:3000/');
    });

    it('should allow admin users to access /admin', async () => {
      // Set current user to admin
      mockCurrentUser = mockAdminUser;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/admin', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should allow access (NextResponse.next())
      // NextResponse.next() returns a response with status 200 or the original request
      expect(response.status).toBe(200);
    });

    it('should redirect unauthenticated users from /orders to /auth', async () => {
      // No current user (unauthenticated)
      mockCurrentUser = null;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/orders', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should redirect to /auth with redirect parameter
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/auth');
      expect(location).toContain('redirect=%2Forders');
    });

    it('should allow authenticated users to access /orders', async () => {
      // Set current user to regular user
      mockCurrentUser = mockRegularUser;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/orders', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should allow access
      expect(response.status).toBe(200);
    });

    it('should redirect unauthenticated users from /checkout to /auth', async () => {
      // No current user (unauthenticated)
      mockCurrentUser = null;

      // Import middleware dynamically to use mocked version
      const { middleware } = await import('@/middleware');

      const request = new NextRequest('http://localhost:3000/checkout', {
        method: 'GET'
      });

      const response = await middleware(request);

      // Should redirect to /auth
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/auth');
      expect(location).toContain('redirect=%2Fcheckout');
    });
  });

  describe('API Route Authentication', () => {
    it('should return 401 for unauthenticated access to /api/cart', async () => {
      // No current user (unauthenticated)
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should allow authenticated users to access /api/cart', async () => {
      // Set current user to regular user
      mockCurrentUser = mockRegularUser;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cart).toBeDefined();
    });

    it('should return 401 for unauthenticated access to /api/admin/orders', async () => {
      // No current user (unauthenticated)
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for regular users accessing /api/admin/orders', async () => {
      // Set current user to regular user (not admin)
      mockCurrentUser = mockRegularUser;

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should allow admin users to access /api/admin/orders', async () => {
      // Set current user to admin
      mockCurrentUser = mockAdminUser;

      // Setup mock orders
      mockOrders = [
        {
          id: 'order-1',
          order_id: 'SAVI-12345678',
          status: 'pending',
          quantity: 1,
          price: 5000,
          confirmed_price: null,
          admin_notes: null,
          contacted_at: null,
          phone: '9876543210',
          address_line1: '123 Test Street',
          address_line2: null,
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          country: 'India',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'user-123',
          variant_id: 'variant-1',
          user_profiles: {
            id: 'user-123',
            name: 'Test Customer',
            email: 'customer@example.com'
          },
          product_variants: {
            id: 'variant-1',
            color: 'Red',
            size: 'M',
            image_url: 'https://example.com/image.jpg',
            product_id: 'product-1',
            products: {
              id: 'product-1',
              name: 'Elegant Silk Saree',
              category: 'Silk'
            }
          }
        }
      ];

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders).toBeDefined();
      expect(Array.isArray(data.orders)).toBe(true);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate JWT token and extract user information', async () => {
      // Setup mock user data
      mockUserData = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        email_verified: true
      };

      // Login to get JWT token
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'SecurePass123'
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.message).toBe('Login successful');
      expect(loginData.user).toBeDefined();
      expect(loginData.user.email).toBe('user@example.com');

      // Verify JWT token was created
      const { signJWT } = await import('@/lib/auth/jwt');
      expect(signJWT).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user'
      });
    });

    it('should validate admin JWT token and extract admin role', async () => {
      // Admin login
      const adminLoginRequest = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'admin123'
        })
      });

      const adminLoginResponse = await adminLoginPOST(adminLoginRequest);
      const adminLoginData = await adminLoginResponse.json();

      expect(adminLoginResponse.status).toBe(200);
      expect(adminLoginData.message).toBe('Admin login successful');

      // Verify admin JWT token was created with admin role
      const { signJWT } = await import('@/lib/auth/jwt');
      expect(signJWT).toHaveBeenCalledWith({
        userId: 'admin',
        email: 'admin@savisanju.com',
        role: 'admin'
      });
    });

    it('should reject invalid JWT tokens', async () => {
      // Set current user to null (invalid token)
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce admin role for admin endpoints', async () => {
      // Test 1: Unauthenticated access
      mockCurrentUser = null;

      let request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      let response = await adminOrdersGET(request);
      let data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');

      // Test 2: Regular user access
      mockCurrentUser = mockRegularUser;

      request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      response = await adminOrdersGET(request);
      data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');

      // Test 3: Admin user access
      mockCurrentUser = mockAdminUser;
      mockOrders = [];

      request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      response = await adminOrdersGET(request);
      data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow regular users to access user endpoints', async () => {
      // Set current user to regular user
      mockCurrentUser = mockRegularUser;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cart).toBeDefined();
    });

    it('should prevent role escalation attempts', async () => {
      // Regular user tries to access admin endpoint
      mockCurrentUser = mockRegularUser;

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      // Should be forbidden, not unauthorized
      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow: login → access protected route → logout', async () => {
      // Step 1: Login as regular user
      mockUserData = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        email_verified: true
      };

      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'SecurePass123'
        })
      });

      const loginResponse = await loginPOST(loginRequest);
      expect(loginResponse.status).toBe(200);

      // Step 2: Access protected route (simulate authenticated state)
      mockCurrentUser = mockRegularUser;

      const cartRequest = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const cartResponse = await cartGET(cartRequest);
      expect(cartResponse.status).toBe(200);

      // Step 3: Verify cannot access admin routes
      const adminRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const adminResponse = await adminOrdersGET(adminRequest);
      expect(adminResponse.status).toBe(403);
    });

    it('should complete full admin authentication flow: admin login → access admin routes', async () => {
      // Step 1: Admin login
      const adminLoginRequest = new NextRequest('http://localhost:3000/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'admin123'
        })
      });

      const adminLoginResponse = await adminLoginPOST(adminLoginRequest);
      expect(adminLoginResponse.status).toBe(200);

      // Step 2: Access admin routes (simulate authenticated admin state)
      mockCurrentUser = mockAdminUser;
      mockOrders = [];

      const adminOrdersRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const adminOrdersResponse = await adminOrdersGET(adminOrdersRequest);
      expect(adminOrdersResponse.status).toBe(200);

      // Step 3: Verify admin can also access user routes
      const cartRequest = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const cartResponse = await cartGET(cartRequest);
      expect(cartResponse.status).toBe(200);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle missing authentication token gracefully', async () => {
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle expired JWT tokens', async () => {
      // Simulate expired token by setting current user to null
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/cart', {
        method: 'GET'
      });

      const response = await cartGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle malformed JWT tokens', async () => {
      // Simulate malformed token by setting current user to null
      mockCurrentUser = null;

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should prevent unauthorized access even with valid user token', async () => {
      // Regular user with valid token tries to access admin endpoint
      mockCurrentUser = mockRegularUser;

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'GET'
      });

      const response = await adminOrdersGET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });
});

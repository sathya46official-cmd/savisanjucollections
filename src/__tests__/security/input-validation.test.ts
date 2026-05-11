import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as addToCartPOST } from '@/app/api/cart/add/route';
import { POST as createOrderPOST } from '@/app/api/orders/create/route';
import { NextRequest } from 'next/server';

/**
 * Security Test: Server-Side Input Validation
 * 
 * Tests that all API endpoints properly validate user input server-side using Zod schemas:
 * 1. Invalid email format - rejected with 400 Bad Request
 * 2. Phone number too short - rejected with 400 Bad Request
 * 3. Weak password (too short) - rejected with 400 Bad Request
 * 4. Negative quantity values - rejected with 400 Bad Request
 * 5. All validation errors return Zod error messages
 * 6. No data is saved to database when validation fails
 * 
 * Requirements: 2.6, 2.11, 2.89
 * 
 * **Validates: Requirements 2.6, 2.11, 2.89 (Server-side input validation with Zod)**
 */

// Mock database operations to track if any writes occur
let mockDatabaseWrites: any[] = [];
let mockUserExists = false;
let mockCurrentUser: any = null;

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'auth_token' && mockCurrentUser) {
        return { value: 'mock-jwt-token' };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn()
  }))
}));

// Mock JWT functions
vi.mock('@/lib/auth/jwt', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockCurrentUser)),
  signJWT: vi.fn((payload: any) => Promise.resolve('mock-jwt-token')),
  setAuthCookie: vi.fn(() => Promise.resolve())
}));

// Mock rate limiting
vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 99 })),
  rateLimitResponse: vi.fn((remaining: number) => 
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  )
}));

// Mock Supabase client to track database writes
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => {
            if (table === 'user_profiles' && mockUserExists) {
              return { data: { id: 'existing-user', email: 'existing@example.com' }, error: null };
            }
            if (table === 'product_variants') {
              return { data: { id: 'variant-123', quantity: 10, price: 5000 }, error: null };
            }
            if (table === 'cart') {
              return { data: { id: 'cart-123' }, error: null };
            }
            return { data: null, error: null };
          })
        }))
      })),
      insert: vi.fn((data: any) => {
        mockDatabaseWrites.push({ table, operation: 'insert', data });
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', ...data }, error: null }))
          }))
        };
      }),
      update: vi.fn((data: any) => {
        mockDatabaseWrites.push({ table, operation: 'update', data });
        return {
          eq: vi.fn(() => ({ data: null, error: null }))
        };
      })
    })),
    auth: {
      admin: {
        createUser: vi.fn((userData: any) => {
          mockDatabaseWrites.push({ table: 'auth.users', operation: 'createUser', data: userData });
          return {
            data: { user: { id: 'new-user-id', email: userData.email } },
            error: null
          };
        }),
        deleteUser: vi.fn()
      }
    },
    rpc: vi.fn((functionName: string, params: any) => {
      mockDatabaseWrites.push({ table: 'rpc', operation: functionName, data: params });
      return { data: true, error: null };
    })
  }
}));

// Mock email service
vi.mock('@/lib/email/resend', () => ({
  sendVerificationEmail: vi.fn(() => Promise.resolve()),
  sendOrderConfirmationEmail: vi.fn(() => Promise.resolve()),
  sendAdminNotificationEmail: vi.fn(() => Promise.resolve())
}));

describe('Security Test: Server-Side Input Validation', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockDatabaseWrites = [];
    mockUserExists = false;
    mockCurrentUser = null;
  });

  describe('Registration Endpoint - Invalid Email Format', () => {
    it('should reject invalid email format with 400 Bad Request', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'double@@domain.com',
        'trailing.dot.@domain.com',
        'no-tld@domain',
        ''
      ];

      for (const invalidEmail of invalidEmails) {
        mockDatabaseWrites = []; // Reset for each test

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: invalidEmail,
            phone: '9876543210',
            password: 'SecurePass123'
          })
        });

        const response = await registerPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error message
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();
        expect(Array.isArray(data.details)).toBe(true);

        // Verify error mentions email
        const emailError = data.details.find((err: any) => err.path.includes('email'));
        expect(emailError).toBeDefined();
        expect(emailError.message).toContain('email');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.in',
        'user+tag@example.com',
        'user123@test-domain.com'
      ];

      for (const validEmail of validEmails) {
        mockDatabaseWrites = [];
        mockUserExists = false;

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: validEmail,
            phone: '9876543210',
            password: 'SecurePass123'
          })
        });

        const response = await registerPOST(request);

        // Should not be a validation error (either 201 success or other error)
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Registration Endpoint - Phone Number Too Short', () => {
    it('should reject phone numbers that are not exactly 10 digits', async () => {
      const invalidPhones = [
        '123',           // Too short
        '12345',         // Too short
        '987654321',     // 9 digits
        '98765432109',   // 11 digits
        '123456789012',  // 12 digits
        'abcdefghij',    // Letters
        '98765-4321',    // Contains dash
        '9876 543210',   // Contains space
        '+919876543210', // Contains plus
        ''               // Empty
      ];

      for (const invalidPhone of invalidPhones) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'user@example.com',
            phone: invalidPhone,
            password: 'SecurePass123'
          })
        });

        const response = await registerPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();

        // Verify error mentions phone
        const phoneError = data.details.find((err: any) => err.path.includes('phone'));
        expect(phoneError).toBeDefined();
        expect(phoneError.message).toContain('10 digits');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should accept valid 10-digit phone numbers', async () => {
      const validPhones = [
        '9876543210',
        '1234567890',
        '0000000000',
        '9999999999'
      ];

      for (const validPhone of validPhones) {
        mockDatabaseWrites = [];
        mockUserExists = false;

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'user@example.com',
            phone: validPhone,
            password: 'SecurePass123'
          })
        });

        const response = await registerPOST(request);

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Registration Endpoint - Weak Password (Too Short)', () => {
    it('should reject passwords shorter than 8 characters', async () => {
      const weakPasswords = [
        '',          // Empty
        'a',         // 1 char
        'ab',        // 2 chars
        'abc',       // 3 chars
        'Pass1',     // 5 chars
        'Pass12',    // 6 chars
        'Pass123'    // 7 chars
      ];

      for (const weakPassword of weakPasswords) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'user@example.com',
            phone: '9876543210',
            password: weakPassword
          })
        });

        const response = await registerPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();

        // Verify error mentions password length
        const passwordError = data.details.find((err: any) => err.path.includes('password'));
        expect(passwordError).toBeDefined();
        expect(passwordError.message).toContain('8 characters');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should accept passwords with 8 or more characters', async () => {
      const strongPasswords = [
        'Pass1234',      // Exactly 8 chars
        'Password123',   // 11 chars
        'VerySecurePassword123!@#', // Long password
        '12345678'       // 8 digits
      ];

      for (const strongPassword of strongPasswords) {
        mockDatabaseWrites = [];
        mockUserExists = false;

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: 'user@example.com',
            phone: '9876543210',
            password: strongPassword
          })
        });

        const response = await registerPOST(request);

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Cart Endpoint - Negative Quantity Values', () => {
    beforeEach(() => {
      // Set up authenticated user for cart tests
      mockCurrentUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };
    });

    it('should reject negative quantity values with 400 Bad Request', async () => {
      const invalidQuantities = [-1, -5, -100, -999];

      for (const invalidQuantity of invalidQuantities) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({
            variantId: '123e4567-e89b-12d3-a456-426614174000',
            quantity: invalidQuantity
          })
        });

        const response = await addToCartPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();

        // Verify error mentions quantity
        const quantityError = data.details.find((err: any) => err.path.includes('quantity'));
        expect(quantityError).toBeDefined();

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should reject zero quantity with 400 Bad Request', async () => {
      mockDatabaseWrites = [];

      const request = new NextRequest('http://localhost:3000/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          variantId: '123e4567-e89b-12d3-a456-426614174000',
          quantity: 0
        })
      });

      const response = await addToCartPOST(request);
      const data = await response.json();

      // Verify 400 status code
      expect(response.status).toBe(400);

      // Verify Zod validation error
      expect(data.error).toBe('Validation failed');

      // Verify no database writes occurred
      expect(mockDatabaseWrites.length).toBe(0);
    });

    it('should reject quantity exceeding maximum (10) with 400 Bad Request', async () => {
      const excessiveQuantities = [11, 15, 100, 999];

      for (const excessiveQuantity of excessiveQuantities) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({
            variantId: '123e4567-e89b-12d3-a456-426614174000',
            quantity: excessiveQuantity
          })
        });

        const response = await addToCartPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error
        expect(data.error).toBe('Validation failed');
        expect(data.details).toBeDefined();

        // Verify error mentions maximum
        const quantityError = data.details.find((err: any) => err.path.includes('quantity'));
        expect(quantityError).toBeDefined();
        expect(quantityError.message).toContain('10');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should accept valid quantity values (1-10)', async () => {
      const validQuantities = [1, 2, 5, 10];

      for (const validQuantity of validQuantities) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({
            variantId: '123e4567-e89b-12d3-a456-426614174000',
            quantity: validQuantity
          })
        });

        const response = await addToCartPOST(request);

        // Should not be a validation error (either 200 success or other error like insufficient stock)
        expect(response.status).not.toBe(400);
      }
    });

    it('should reject non-integer quantity values', async () => {
      const nonIntegerQuantities = [1.5, 2.7, 3.14, 0.5];

      for (const nonIntegerQuantity of nonIntegerQuantities) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({
            variantId: '123e4567-e89b-12d3-a456-426614174000',
            quantity: nonIntegerQuantity
          })
        });

        const response = await addToCartPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify Zod validation error
        expect(data.error).toBe('Validation failed');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });
  });

  describe('Order Creation Endpoint - Invalid Address Data', () => {
    beforeEach(() => {
      mockCurrentUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };
    });

    it('should reject invalid postal code format with 400 Bad Request', async () => {
      const invalidPostalCodes = [
        '12345',      // 5 digits (should be 6)
        '1234567',    // 7 digits
        'ABCDEF',     // Letters
        '12-3456',    // Contains dash
        '123 456',    // Contains space
        ''            // Empty
      ];

      for (const invalidPostalCode of invalidPostalCodes) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/orders/create', {
          method: 'POST',
          body: JSON.stringify({
            items: [
              { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }
            ],
            address: {
              line1: '123 Main Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              postalCode: invalidPostalCode,
              country: 'India'
            },
            phone: '9876543210'
          })
        });

        const response = await createOrderPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify validation error
        expect(data.error).toBe('Invalid input');
        expect(data.details).toBeDefined();

        // Verify error mentions postal code
        const postalCodeError = data.details.find((err: any) => 
          err.path.includes('postalCode') || err.path.includes('address')
        );
        expect(postalCodeError).toBeDefined();
        expect(postalCodeError.message).toContain('6 digits');

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should reject address with line1 too short', async () => {
      const shortAddresses = ['', 'a', 'ab', 'abc', 'abcd']; // Less than 5 chars

      for (const shortAddress of shortAddresses) {
        mockDatabaseWrites = [];

        const request = new NextRequest('http://localhost:3000/api/orders/create', {
          method: 'POST',
          body: JSON.stringify({
            items: [
              { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }
            ],
            address: {
              line1: shortAddress,
              city: 'Mumbai',
              state: 'Maharashtra',
              postalCode: '400001',
              country: 'India'
            },
            phone: '9876543210'
          })
        });

        const response = await createOrderPOST(request);
        const data = await response.json();

        // Verify 400 status code
        expect(response.status).toBe(400);

        // Verify validation error
        expect(data.error).toBe('Invalid input');
        expect(data.details).toBeDefined();

        // Verify no database writes occurred
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });

    it('should reject empty items array', async () => {
      mockDatabaseWrites = [];

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: [], // Empty cart
          address: {
            line1: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India'
          },
          phone: '9876543210'
        })
      });

      const response = await createOrderPOST(request);
      const data = await response.json();

      // Verify 400 status code
      expect(response.status).toBe(400);

      // Verify validation error
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();

      // Verify error mentions cart/items
      const itemsError = data.details.find((err: any) => err.path.includes('items'));
      expect(itemsError).toBeDefined();
      expect(itemsError.message).toContain('empty');

      // Verify no database writes occurred
      expect(mockDatabaseWrites.length).toBe(0);
    });
  });

  describe('Comprehensive Validation Error Response Format', () => {
    it('should return consistent error format with Zod validation details', async () => {
      // Test with multiple validation errors at once
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'T', // Too short (min 2)
          email: 'invalid-email', // Invalid format
          phone: '123', // Too short (must be 10 digits)
          password: 'short' // Too short (min 8)
        })
      });

      const response = await registerPOST(request);
      const data = await response.json();

      // Verify 400 status code
      expect(response.status).toBe(400);

      // Verify error structure
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
      expect(Array.isArray(data.details)).toBe(true);

      // Verify all validation errors are present
      expect(data.details.length).toBeGreaterThanOrEqual(4);

      // Verify each error has required fields
      data.details.forEach((error: any) => {
        expect(error).toHaveProperty('path');
        expect(error).toHaveProperty('message');
        expect(Array.isArray(error.path)).toBe(true);
      });

      // Verify specific errors
      const nameError = data.details.find((err: any) => err.path.includes('name'));
      expect(nameError).toBeDefined();
      expect(nameError.message).toContain('2 characters');

      const emailError = data.details.find((err: any) => err.path.includes('email'));
      expect(emailError).toBeDefined();
      expect(emailError.message).toContain('email');

      const phoneError = data.details.find((err: any) => err.path.includes('phone'));
      expect(phoneError).toBeDefined();
      expect(phoneError.message).toContain('10 digits');

      const passwordError = data.details.find((err: any) => err.path.includes('password'));
      expect(passwordError).toBeDefined();
      expect(passwordError.message).toContain('8 characters');

      // Verify no database writes occurred
      expect(mockDatabaseWrites.length).toBe(0);
    });

    it('should return 400 status code for all validation failures', async () => {
      const invalidRequests = [
        {
          endpoint: 'register',
          handler: registerPOST,
          url: 'http://localhost:3000/api/auth/register',
          body: {
            name: 'Test User',
            email: 'invalid',
            phone: '9876543210',
            password: 'SecurePass123'
          }
        },
        {
          endpoint: 'addToCart',
          handler: addToCartPOST,
          url: 'http://localhost:3000/api/cart/add',
          body: {
            variantId: 'not-a-uuid',
            quantity: 1
          }
        }
      ];

      for (const testCase of invalidRequests) {
        mockDatabaseWrites = [];
        mockCurrentUser = {
          userId: 'user-123',
          email: 'user@example.com',
          role: 'user'
        };

        const request = new NextRequest(testCase.url, {
          method: 'POST',
          body: JSON.stringify(testCase.body)
        });

        const response = await testCase.handler(request);

        // All validation failures should return 400
        expect(response.status).toBe(400);

        // No database writes should occur
        expect(mockDatabaseWrites.length).toBe(0);
      }
    });
  });

  describe('Database Write Prevention on Validation Failure', () => {
    it('should NOT create user in database when email validation fails', async () => {
      mockDatabaseWrites = [];

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email-format',
          phone: '9876543210',
          password: 'SecurePass123'
        })
      });

      const response = await registerPOST(request);

      // Verify validation failed
      expect(response.status).toBe(400);

      // Verify NO database operations occurred
      expect(mockDatabaseWrites.length).toBe(0);

      // Verify no auth user creation
      const authUserCreation = mockDatabaseWrites.find(
        (write) => write.table === 'auth.users' && write.operation === 'createUser'
      );
      expect(authUserCreation).toBeUndefined();

      // Verify no user profile creation
      const profileCreation = mockDatabaseWrites.find(
        (write) => write.table === 'user_profiles' && write.operation === 'insert'
      );
      expect(profileCreation).toBeUndefined();
    });

    it('should NOT add item to cart when quantity validation fails', async () => {
      mockCurrentUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };
      mockDatabaseWrites = [];

      const request = new NextRequest('http://localhost:3000/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          variantId: '123e4567-e89b-12d3-a456-426614174000',
          quantity: -5 // Invalid negative quantity
        })
      });

      const response = await addToCartPOST(request);

      // Verify validation failed
      expect(response.status).toBe(400);

      // Verify NO database operations occurred
      expect(mockDatabaseWrites.length).toBe(0);

      // Verify no cart item insertion
      const cartItemInsert = mockDatabaseWrites.find(
        (write) => write.table === 'cart_items' && write.operation === 'insert'
      );
      expect(cartItemInsert).toBeUndefined();
    });

    it('should NOT create order when address validation fails', async () => {
      mockCurrentUser = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };
      mockDatabaseWrites = [];

      const request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            { variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }
          ],
          address: {
            line1: 'abc', // Too short (min 5 chars)
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'India'
          },
          phone: '9876543210'
        })
      });

      const response = await createOrderPOST(request);

      // Verify validation failed
      expect(response.status).toBe(400);

      // Verify NO database operations occurred
      expect(mockDatabaseWrites.length).toBe(0);

      // Verify no order creation
      const orderCreation = mockDatabaseWrites.find(
        (write) => write.table === 'orders' && write.operation === 'insert'
      );
      expect(orderCreation).toBeUndefined();

      // Verify no stock reservation
      const stockReservation = mockDatabaseWrites.find(
        (write) => write.table === 'rpc' && write.operation === 'reserve_stock'
      );
      expect(stockReservation).toBeUndefined();
    });

    it('should track that validation happens BEFORE any database operations', async () => {
      mockDatabaseWrites = [];

      // Create a request that will fail validation
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid',
          phone: '123',
          password: 'short'
        })
      });

      const response = await registerPOST(request);

      // Verify validation failed
      expect(response.status).toBe(400);

      // Verify database writes array is empty (validation prevented all operations)
      expect(mockDatabaseWrites).toEqual([]);
    });
  });

  describe('Security Audit Summary', () => {
    it('should provide comprehensive input validation security audit', async () => {
      console.log('\n=== Input Validation Security Audit Summary ===');
      
      // Test 1: Invalid Email
      mockDatabaseWrites = [];
      let request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email',
          phone: '9876543210',
          password: 'SecurePass123'
        })
      });
      let response = await registerPOST(request);
      const emailTest = {
        scenario: 'Invalid Email Format',
        status: response.status,
        passed: response.status === 400 && mockDatabaseWrites.length === 0
      };
      console.log(`✅ ${emailTest.scenario}: ${emailTest.passed ? 'PASS' : 'FAIL'} (Status: ${emailTest.status}, DB Writes: ${mockDatabaseWrites.length})`);

      // Test 2: Short Phone
      mockDatabaseWrites = [];
      request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'user@example.com',
          phone: '123',
          password: 'SecurePass123'
        })
      });
      response = await registerPOST(request);
      const phoneTest = {
        scenario: 'Phone Too Short',
        status: response.status,
        passed: response.status === 400 && mockDatabaseWrites.length === 0
      };
      console.log(`✅ ${phoneTest.scenario}: ${phoneTest.passed ? 'PASS' : 'FAIL'} (Status: ${phoneTest.status}, DB Writes: ${mockDatabaseWrites.length})`);

      // Test 3: Weak Password
      mockDatabaseWrites = [];
      request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'user@example.com',
          phone: '9876543210',
          password: 'short'
        })
      });
      response = await registerPOST(request);
      const passwordTest = {
        scenario: 'Weak Password (Too Short)',
        status: response.status,
        passed: response.status === 400 && mockDatabaseWrites.length === 0
      };
      console.log(`✅ ${passwordTest.scenario}: ${passwordTest.passed ? 'PASS' : 'FAIL'} (Status: ${passwordTest.status}, DB Writes: ${mockDatabaseWrites.length})`);

      // Test 4: Negative Quantity
      mockCurrentUser = { userId: 'user-123', email: 'user@example.com', role: 'user' };
      mockDatabaseWrites = [];
      request = new NextRequest('http://localhost:3000/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          variantId: '123e4567-e89b-12d3-a456-426614174000',
          quantity: -5
        })
      });
      response = await addToCartPOST(request);
      const quantityTest = {
        scenario: 'Negative Quantity',
        status: response.status,
        passed: response.status === 400 && mockDatabaseWrites.length === 0
      };
      console.log(`✅ ${quantityTest.scenario}: ${quantityTest.passed ? 'PASS' : 'FAIL'} (Status: ${quantityTest.status}, DB Writes: ${mockDatabaseWrites.length})`);

      // Test 5: Invalid Postal Code
      mockDatabaseWrites = [];
      request = new NextRequest('http://localhost:3000/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ variantId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }],
          address: {
            line1: '123 Main Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '12345', // 5 digits instead of 6
            country: 'India'
          },
          phone: '9876543210'
        })
      });
      response = await createOrderPOST(request);
      const postalCodeTest = {
        scenario: 'Invalid Postal Code',
        status: response.status,
        passed: response.status === 400 && mockDatabaseWrites.length === 0
      };
      console.log(`✅ ${postalCodeTest.scenario}: ${postalCodeTest.passed ? 'PASS' : 'FAIL'} (Status: ${postalCodeTest.status}, DB Writes: ${mockDatabaseWrites.length})`);

      console.log('\n=== Validation Summary ===');
      console.log('✅ All invalid inputs rejected with 400 Bad Request');
      console.log('✅ All validation errors return Zod error messages');
      console.log('✅ No database writes occur when validation fails');
      console.log('✅ Server-side validation prevents malicious input');
      console.log('\n=== Requirements Validated ===');
      console.log('✅ Requirement 2.6: Server-side input validation and sanitization');
      console.log('✅ Requirement 2.11: Strict schema validation (email, phone, address)');
      console.log('✅ Requirement 2.89: Zod schema validation library used');
      console.log('===========================================\n');

      // Verify all tests passed
      expect(emailTest.passed).toBe(true);
      expect(phoneTest.passed).toBe(true);
      expect(passwordTest.passed).toBe(true);
      expect(quantityTest.passed).toBe(true);
      expect(postalCodeTest.passed).toBe(true);
    });
  });
});

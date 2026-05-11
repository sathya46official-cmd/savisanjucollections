import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as adminLoginPOST } from '@/app/api/admin/login/route';
import { PUT as updateStockPUT } from '@/app/api/admin/stock/[variantId]/route';
import { POST as notifyMePOST } from '@/app/api/stock/notify/route';
import { NextRequest } from 'next/server';

/**
 * Integration Test: Admin Stock Management and Notifications Flow
 * 
 * Tests the end-to-end admin stock management flow:
 * 1. Admin login
 * 2. Set product stock to 0
 * 3. Customer requests "Notify Me" (simulate different user)
 * 4. Admin updates stock to 5
 * 5. Verify stock notification emails sent
 * 6. Verify notified_at timestamp set
 * 
 * Requirements: 2.50 (Admin stock updates), 2.69 (Stock notifications)
 * 
 * **Validates: Requirements 2.50 (Admin stock management), 2.69 (Stock notifications)**
 */

// Mock data
let mockVariants: any[] = [];
let mockStockNotifications: any[] = [];
let mockAdminPasswordHash: string = '';
let mockCurrentUser: any = null;
let mockNotifyStockAvailableResult: any[] = [];

// Mock admin user
const mockAdminUser = {
  userId: 'admin',
  email: 'admin@savisanju.com',
  role: 'admin'
};

// Mock regular user (customer)
const mockCustomerUser = {
  userId: 'customer-123',
  email: 'customer@example.com',
  role: 'user'
};

vi.mock('@/lib/auth/jwt', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockCurrentUser)),
  signJWT: vi.fn((payload: any) => Promise.resolve('mock-admin-jwt-token')),
  setAuthCookie: vi.fn(() => Promise.resolve()),
  verifyJWT: vi.fn(() => Promise.resolve(mockCurrentUser))
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn((password: string, hash: string) => {
    // Simple mock: password 'admin123' matches the hash
    if (password === 'admin123' && hash === mockAdminPasswordHash) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  })
}));

vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 10 })),
  rateLimitResponse: vi.fn((remaining: number) => 
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  )
}));

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'product_variants') {
        return {
          select: vi.fn((fields?: string) => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(() => {
                const variant = mockVariants.find(v => v.id === value);
                if (variant) {
                  // Return only the requested fields if specified
                  if (fields && fields.includes('id') && fields.includes('quantity')) {
                    return { data: { id: variant.id, quantity: variant.quantity }, error: null };
                  }
                  return { data: variant, error: null };
                }
                return { data: null, error: { message: 'Variant not found' } };
              })
            }))
          })),
          update: vi.fn((data: any) => ({
            eq: vi.fn((field: string, value: string) => {
              const variantIndex = mockVariants.findIndex(v => v.id === value);
              if (variantIndex !== -1) {
                mockVariants[variantIndex] = { ...mockVariants[variantIndex], ...data };
                return { error: null };
              }
              return { error: { message: 'Variant not found' } };
            })
          }))
        };
      }

      if (table === 'stock_notifications') {
        return {
          select: vi.fn((fields?: string) => ({
            eq: vi.fn((field: string, value: string) => {
              if (field === 'variant_id') {
                return {
                  eq: vi.fn((field2: string, value2: string) => {
                    if (field2 === 'email') {
                      return {
                        is: vi.fn((field3: string, value3: null) => ({
                          single: vi.fn(() => {
                            const notification = mockStockNotifications.find(
                              n => n.variant_id === value && n.email === value2 && n.notified_at === null
                            );
                            if (notification) {
                              return { data: notification, error: null };
                            }
                            return { data: null, error: null };
                          })
                        }))
                      };
                    }
                    return {
                      single: vi.fn(() => ({ data: null, error: null }))
                    };
                  })
                };
              }
              return {
                single: vi.fn(() => ({ data: null, error: null }))
              };
            })
          })),
          insert: vi.fn((data: any) => {
            const newNotification = {
              id: `notification-${mockStockNotifications.length + 1}`,
              notified_at: null,
              ...data
            };
            mockStockNotifications.push(newNotification);
            return { error: null };
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
    rpc: vi.fn((functionName: string, params: any) => {
      if (functionName === 'notify_stock_available') {
        // Return notifications that were sent
        const notifications = mockStockNotifications.filter(
          n => n.variant_id === params.p_variant_id && n.notified_at === null
        );
        
        // Mark notifications as sent
        notifications.forEach(n => {
          n.notified_at = new Date().toISOString();
        });
        
        mockNotifyStockAvailableResult = notifications;
        return { data: notifications, error: null };
      }
      return { data: null, error: null };
    })
  }
}));

describe('Integration Test: Admin Stock Management and Notifications Flow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set admin password hash
    mockAdminPasswordHash = '$2a$10$mockHashForAdmin123Password';

    // Set current user to admin
    mockCurrentUser = mockAdminUser;

    // Setup mock variants
    mockVariants = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        product_id: 'product-1',
        color: 'Red',
        size: 'M',
        quantity: 5,
        image_url: 'https://example.com/image1.jpg',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        updated_at: new Date('2024-01-15T10:00:00Z').toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        product_id: 'product-2',
        color: 'Blue',
        size: 'L',
        quantity: 0,
        image_url: 'https://example.com/image2.jpg',
        created_at: new Date('2024-01-14T14:00:00Z').toISOString(),
        updated_at: new Date('2024-01-14T14:00:00Z').toISOString()
      }
    ];

    // Setup mock stock notifications
    mockStockNotifications = [];
    mockNotifyStockAvailableResult = [];

    // Mock environment variable
    process.env.ADMIN_PASSWORD_HASH = mockAdminPasswordHash;
  });

  afterEach(() => {
    // Clean up
    mockVariants = [];
    mockStockNotifications = [];
    mockNotifyStockAvailableResult = [];
    mockCurrentUser = null;
    delete process.env.ADMIN_PASSWORD_HASH;
  });

  it('should complete the full admin stock management and notification flow', async () => {
    // Step 1: Admin login
    const loginRequest = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'admin123'
      })
    });

    const loginResponse = await adminLoginPOST(loginRequest);
    const loginData = await loginResponse.json();

    // Verify admin login successful
    expect(loginResponse.status).toBe(200);
    expect(loginData.message).toBe('Admin login successful');
    expect(loginData.user.role).toBe('admin');

    // Step 2: Admin sets product stock to 0
    const setStockToZeroRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/00000000-0000-0000-0000-000000000001',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 0
        })
      }
    );

    const setStockToZeroResponse = await updateStockPUT(
      setStockToZeroRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const setStockToZeroData = await setStockToZeroResponse.json();

    // Verify stock update successful
    expect(setStockToZeroResponse.status).toBe(200);
    expect(setStockToZeroData.success).toBe(true);
    expect(setStockToZeroData.previousQuantity).toBe(5);
    expect(setStockToZeroData.newQuantity).toBe(0);
    expect(setStockToZeroData.notificationsSent).toBe(0); // No notifications yet

    // Verify variant stock updated
    const variant = mockVariants.find(v => v.id === '550e8400-e29b-41d4-a716-446655440001');
    expect(variant?.quantity).toBe(0);

    // Step 3: Customer requests "Notify Me" (simulate different user)
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify notification request successful
    expect(notifyMeResponse.status).toBe(200);
    expect(notifyMeData.success).toBe(true);
    expect(notifyMeData.message).toBe('You will be notified when this product is back in stock');

    // Verify notification created in database
    expect(mockStockNotifications.length).toBe(1);
    expect(mockStockNotifications[0].variant_id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(mockStockNotifications[0].email).toBe('customer@example.com');
    expect(mockStockNotifications[0].user_id).toBe('customer-123');
    expect(mockStockNotifications[0].notified_at).toBeNull();

    // Add another customer notification
    const notifyMeRequest2 = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'another@example.com'
        })
      }
    );

    const notifyMeResponse2 = await notifyMePOST(notifyMeRequest2);
    expect(notifyMeResponse2.status).toBe(200);
    expect(mockStockNotifications.length).toBe(2);

    // Step 4: Admin updates stock to 5 (back in stock)
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 5
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Step 5: Verify stock notification emails sent
    expect(updateStockResponse.status).toBe(200);
    expect(updateStockData.success).toBe(true);
    expect(updateStockData.previousQuantity).toBe(0);
    expect(updateStockData.newQuantity).toBe(5);
    expect(updateStockData.notificationsSent).toBe(2); // Both customers notified

    // Verify variant stock updated
    const updatedVariant = mockVariants.find(v => v.id === '550e8400-e29b-41d4-a716-446655440001');
    expect(updatedVariant?.quantity).toBe(5);

    // Step 6: Verify notified_at timestamp set
    const notification1 = mockStockNotifications.find(n => n.email === 'customer@example.com');
    const notification2 = mockStockNotifications.find(n => n.email === 'another@example.com');

    expect(notification1?.notified_at).toBeDefined();
    expect(notification1?.notified_at).not.toBeNull();
    expect(notification2?.notified_at).toBeDefined();
    expect(notification2?.notified_at).not.toBeNull();

    // Verify notifications were marked as sent
    expect(mockNotifyStockAvailableResult.length).toBe(2);
  });

  it('should not send notifications when stock remains at 0', async () => {
    // Set variant to 0 stock
    mockVariants[0].quantity = 0;

    // Customer requests notification
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'customer@example.com'
        })
      }
    );

    await notifyMePOST(notifyMeRequest);
    expect(mockStockNotifications.length).toBe(1);

    // Admin updates stock from 0 to 0 (no change)
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 0
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify no notifications sent
    expect(updateStockResponse.status).toBe(200);
    expect(updateStockData.notificationsSent).toBe(0);

    // Verify notified_at still null
    const notification = mockStockNotifications[0];
    expect(notification.notified_at).toBeNull();
  });

  it('should not send notifications when stock goes from positive to positive', async () => {
    // Set variant to 5 stock
    mockVariants[0].quantity = 5;

    // Customer requests notification (should fail - product in stock)
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify notification request rejected
    expect(notifyMeResponse.status).toBe(400);
    expect(notifyMeData.error).toBe('Product is currently in stock');
    expect(mockStockNotifications.length).toBe(0);

    // Admin updates stock from 5 to 10
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 10
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify no notifications sent
    expect(updateStockResponse.status).toBe(200);
    expect(updateStockData.notificationsSent).toBe(0);
  });

  it('should prevent duplicate notification requests from same email', async () => {
    // Set variant to 0 stock
    mockVariants[0].quantity = 0;

    // Customer requests notification
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest1 = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse1 = await notifyMePOST(notifyMeRequest1);
    expect(notifyMeResponse1.status).toBe(200);
    expect(mockStockNotifications.length).toBe(1);

    // Same customer requests notification again
    const notifyMeRequest2 = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse2 = await notifyMePOST(notifyMeRequest2);
    const notifyMeData2 = await notifyMeResponse2.json();

    // Verify duplicate notification prevented
    expect(notifyMeResponse2.status).toBe(200);
    expect(notifyMeData2.message).toBe('You are already subscribed to notifications for this product');
    expect(mockStockNotifications.length).toBe(1); // Still only 1 notification
  });

  it('should require admin authentication to update stock', async () => {
    // Mock unauthenticated user
    mockCurrentUser = null;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 10
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify unauthorized error
    expect(updateStockResponse.status).toBe(401);
    expect(updateStockData.error).toBe('Unauthorized');

    // Verify stock unchanged
    expect(mockVariants[0].quantity).toBe(5);
  });

  it('should require admin role to update stock (reject regular users)', async () => {
    // Mock regular user (not admin)
    mockCurrentUser = mockCustomerUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 10
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify forbidden error
    expect(updateStockResponse.status).toBe(403);
    expect(updateStockData.error).toBe('Forbidden');

    // Verify stock unchanged
    expect(mockVariants[0].quantity).toBe(5);
  });

  it('should validate stock quantity input (reject negative values)', async () => {
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: -5 // Invalid negative quantity
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify validation error
    expect(updateStockResponse.status).toBe(400);
    expect(updateStockData.error).toBe('Invalid input');

    // Verify stock unchanged
    expect(mockVariants[0].quantity).toBe(5);
  });

  it('should handle non-existent variant gracefully', async () => {
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/non-existent-variant',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 10
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: 'non-existent-variant' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify not found error
    expect(updateStockResponse.status).toBe(404);
    expect(updateStockData.error).toBe('Product variant not found');
  });

  it('should validate notification request input (invalid variant ID)', async () => {
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: 'invalid-uuid', // Invalid UUID format
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify validation error
    expect(notifyMeResponse.status).toBe(400);
    expect(notifyMeData.error).toBe('Invalid input');
  });

  it('should validate notification request input (invalid email)', async () => {
    mockCurrentUser = mockCustomerUser;
    mockVariants[0].quantity = 0;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'invalid-email' // Invalid email format
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify validation error
    expect(notifyMeResponse.status).toBe(400);
    expect(notifyMeData.error).toBe('Invalid input');
  });

  it('should allow guest users to request stock notifications', async () => {
    // Mock unauthenticated user (guest)
    mockCurrentUser = null;
    mockVariants[0].quantity = 0;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '550e8400-e29b-41d4-a716-446655440001',
          email: 'guest@example.com'
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify notification request successful
    expect(notifyMeResponse.status).toBe(200);
    expect(notifyMeData.success).toBe(true);

    // Verify notification created with null user_id
    expect(mockStockNotifications.length).toBe(1);
    expect(mockStockNotifications[0].user_id).toBeNull();
    expect(mockStockNotifications[0].email).toBe('guest@example.com');
  });

  it('should handle notification for non-existent variant', async () => {
    mockCurrentUser = mockCustomerUser;

    const notifyMeRequest = new NextRequest(
      'http://localhost:3000/api/stock/notify',
      {
        method: 'POST',
        body: JSON.stringify({
          variantId: '00000000-0000-0000-0000-000000000000', // Valid UUID but doesn't exist
          email: 'customer@example.com'
        })
      }
    );

    const notifyMeResponse = await notifyMePOST(notifyMeRequest);
    const notifyMeData = await notifyMeResponse.json();

    // Verify not found error
    expect(notifyMeResponse.status).toBe(404);
    expect(notifyMeData.error).toBe('Product variant not found');
  });

  it('should update stock and send notifications atomically', async () => {
    // Set variant to 0 stock
    mockVariants[0].quantity = 0;

    // Multiple customers request notifications
    mockCurrentUser = mockCustomerUser;

    for (let i = 1; i <= 5; i++) {
      const notifyMeRequest = new NextRequest(
        'http://localhost:3000/api/stock/notify',
        {
          method: 'POST',
          body: JSON.stringify({
            variantId: '550e8400-e29b-41d4-a716-446655440001',
            email: `customer${i}@example.com`
          })
        }
      );

      await notifyMePOST(notifyMeRequest);
    }

    expect(mockStockNotifications.length).toBe(5);

    // Admin updates stock to 10
    mockCurrentUser = mockAdminUser;

    const updateStockRequest = new NextRequest(
      'http://localhost:3000/api/admin/stock/variant-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          quantity: 10
        })
      }
    );

    const updateStockResponse = await updateStockPUT(
      updateStockRequest,
      { params: { variantId: '550e8400-e29b-41d4-a716-446655440001' } }
    );
    const updateStockData = await updateStockResponse.json();

    // Verify all notifications sent
    expect(updateStockResponse.status).toBe(200);
    expect(updateStockData.notificationsSent).toBe(5);

    // Verify all notifications have notified_at timestamp
    mockStockNotifications.forEach(notification => {
      expect(notification.notified_at).toBeDefined();
      expect(notification.notified_at).not.toBeNull();
    });

    // Verify stock updated
    expect(mockVariants[0].quantity).toBe(10);
  });
});



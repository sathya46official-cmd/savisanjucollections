import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as adminLoginPOST } from '@/app/api/admin/login/route';
import { GET as adminOrdersGET } from '@/app/api/admin/orders/route';
import { PUT as updateOrderStatusPUT } from '@/app/api/admin/orders/[id]/status/route';
import { NextRequest } from 'next/server';

/**
 * Integration Test: Admin Order Management Flow
 * 
 * Tests the end-to-end admin order management flow:
 * 1. Login as admin
 * 2. View orders dashboard
 * 3. Update order status: pending → confirmed
 * 4. Verify contacted_at timestamp set
 * 5. Add admin notes
 * 6. Update status: confirmed → processing → shipped → delivered
 * 7. Verify status transitions validated (attempt invalid transition)
 * 
 * Requirements: 2.32-2.37, 2.39, 2.46
 * 
 * **Validates: Requirements 2.32-2.37 (Order status workflow), 2.39 (Admin notes), 2.46 (Status transition validation)**
 */

// Mock data
let mockOrders: any[] = [];
let mockAdminPasswordHash: string = '';
let mockCurrentUser: any = null;

// Mock admin user
const mockAdminUser = {
  userId: 'admin',
  email: 'admin@savisanju.com',
  role: 'admin'
};

// Mock regular user (for testing authorization)
const mockRegularUser = {
  userId: 'user-123',
  email: 'user@example.com',
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
      if (table === 'orders') {
        return {
          select: vi.fn((fields?: string) => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(() => {
                const order = mockOrders.find(o => o.id === value);
                if (order) {
                  return { data: order, error: null };
                }
                return { data: null, error: { message: 'Order not found' } };
              })
            })),
            gt: vi.fn((field: string, value: string) => ({
              order: vi.fn(() => {
                // Filter orders created after 'since' timestamp
                const filteredOrders = mockOrders.filter(o => o.created_at > value);
                return { data: filteredOrders, error: null };
              })
            })),
            order: vi.fn(() => {
              // Return all orders sorted by created_at DESC
              const sortedOrders = [...mockOrders].sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              return { data: sortedOrders, error: null };
            })
          })),
          update: vi.fn((data: any) => ({
            eq: vi.fn((field: string, value: string) => {
              const orderIndex = mockOrders.findIndex(o => o.id === value);
              if (orderIndex !== -1) {
                mockOrders[orderIndex] = { ...mockOrders[orderIndex], ...data };
                return { error: null };
              }
              return { error: { message: 'Order not found' } };
            })
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
    })
  }
}));

describe('Integration Test: Admin Order Management Flow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set admin password hash
    mockAdminPasswordHash = '$2a$10$mockHashForAdmin123Password';

    // Set current user to admin
    mockCurrentUser = mockAdminUser;

    // Setup mock orders with proper structure
    mockOrders = [
      {
        id: 'order-1',
        order_id: 'SAVI-12345678',
        status: 'pending',
        quantity: 2,
        price: 5000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: '9876543210',
        address_line1: '123 Test Street',
        address_line2: 'Apt 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        created_at: new Date('2024-01-15T10:00:00Z').toISOString(),
        updated_at: new Date('2024-01-15T10:00:00Z').toISOString(),
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
          image_url: 'https://example.com/image1.jpg',
          product_id: 'product-1',
          products: {
            id: 'product-1',
            name: 'Elegant Silk Saree',
            category: 'Silk'
          }
        }
      },
      {
        id: 'order-2',
        order_id: 'SAVI-87654321',
        status: 'confirmed',
        quantity: 1,
        price: 6000,
        confirmed_price: 5500,
        admin_notes: 'Customer requested discount',
        contacted_at: new Date('2024-01-14T15:30:00Z').toISOString(),
        phone: '9876543211',
        address_line1: '456 Another Street',
        address_line2: null,
        city: 'Delhi',
        state: 'Delhi',
        postal_code: '110001',
        country: 'India',
        created_at: new Date('2024-01-14T14:00:00Z').toISOString(),
        updated_at: new Date('2024-01-14T15:30:00Z').toISOString(),
        user_id: 'user-456',
        variant_id: 'variant-2',
        user_profiles: {
          id: 'user-456',
          name: 'Another Customer',
          email: 'another@example.com'
        },
        product_variants: {
          id: 'variant-2',
          color: 'Blue',
          size: 'L',
          image_url: 'https://example.com/image2.jpg',
          product_id: 'product-2',
          products: {
            id: 'product-2',
            name: 'Designer Cotton Saree',
            category: 'Cotton'
          }
        }
      }
    ];

    // Mock environment variable
    process.env.ADMIN_PASSWORD_HASH = mockAdminPasswordHash;
  });

  afterEach(() => {
    // Clean up
    mockOrders = [];
    mockCurrentUser = null;
    delete process.env.ADMIN_PASSWORD_HASH;
  });

  it('should complete the full admin order management flow: login → view orders → update status', async () => {
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
    expect(loginData.user.email).toBe('admin@savisanju.com');

    // Step 2: View orders dashboard
    const ordersRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const ordersResponse = await adminOrdersGET(ordersRequest);
    const ordersData = await ordersResponse.json();

    // Verify orders fetched successfully
    expect(ordersResponse.status).toBe(200);
    expect(ordersData.success).toBe(true);
    expect(ordersData.orders).toBeDefined();
    expect(ordersData.orders.length).toBe(2);

    // Verify orders are sorted by created_at DESC (most recent first)
    expect(ordersData.orders[0].orderId).toBe('SAVI-12345678'); // Created 2024-01-15
    expect(ordersData.orders[1].orderId).toBe('SAVI-87654321'); // Created 2024-01-14

    // Step 3: Update order status from pending to confirmed
    const updateStatusRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed',
          adminNotes: 'Customer contacted via WhatsApp',
          confirmedPrice: 4800
        })
      }
    );

    const updateStatusResponse = await updateOrderStatusPUT(
      updateStatusRequest,
      { params: { id: 'order-1' } }
    );
    const updateStatusData = await updateStatusResponse.json();

    // Verify status update successful
    expect(updateStatusResponse.status).toBe(200);
    expect(updateStatusData.success).toBe(true);
    expect(updateStatusData.message).toBe('Order status updated successfully');

    // Step 4: Verify contacted_at timestamp was set
    const updatedOrder = mockOrders.find(o => o.id === 'order-1');
    expect(updatedOrder?.status).toBe('confirmed');
    expect(updatedOrder?.contacted_at).toBeDefined();
    expect(updatedOrder?.contacted_at).not.toBeNull();

    // Step 5: Verify admin notes were added
    expect(updatedOrder?.admin_notes).toBe('Customer contacted via WhatsApp');
    expect(updatedOrder?.confirmed_price).toBe(4800);

    // Step 6: Update status through workflow: confirmed → processing → shipped → delivered
    // confirmed → processing
    const toProcessingRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'processing'
        })
      }
    );

    const toProcessingResponse = await updateOrderStatusPUT(
      toProcessingRequest,
      { params: { id: 'order-1' } }
    );

    expect(toProcessingResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('processing');

    // processing → shipped
    const toShippedRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'shipped',
          adminNotes: 'Shipped via Blue Dart, tracking: BD123456'
        })
      }
    );

    const toShippedResponse = await updateOrderStatusPUT(
      toShippedRequest,
      { params: { id: 'order-1' } }
    );

    expect(toShippedResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('shipped');
    expect(mockOrders.find(o => o.id === 'order-1')?.admin_notes).toBe(
      'Shipped via Blue Dart, tracking: BD123456'
    );

    // shipped → delivered
    const toDeliveredRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'delivered'
        })
      }
    );

    const toDeliveredResponse = await updateOrderStatusPUT(
      toDeliveredRequest,
      { params: { id: 'order-1' } }
    );

    expect(toDeliveredResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('delivered');
  });

  it('should validate status transitions and reject invalid transitions', async () => {
    // Try to transition from pending directly to shipped (invalid)
    const invalidTransitionRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'shipped'
        })
      }
    );

    const invalidTransitionResponse = await updateOrderStatusPUT(
      invalidTransitionRequest,
      { params: { id: 'order-1' } }
    );
    const invalidTransitionData = await invalidTransitionResponse.json();

    // Verify invalid transition rejected
    expect(invalidTransitionResponse.status).toBe(400);
    expect(invalidTransitionData.error).toBe('Invalid status transition');
    expect(invalidTransitionData.message).toContain('Cannot transition from pending to shipped');
    expect(invalidTransitionData.allowedTransitions).toEqual(['confirmed', 'cancelled']);

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('pending');
  });

  it('should prevent transitions from delivered status', async () => {
    // Set order to delivered
    mockOrders[0].status = 'delivered';

    // Try to transition from delivered to any other status (invalid)
    const invalidRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'processing'
        })
      }
    );

    const invalidResponse = await updateOrderStatusPUT(
      invalidRequest,
      { params: { id: 'order-1' } }
    );
    const invalidData = await invalidResponse.json();

    // Verify transition rejected
    expect(invalidResponse.status).toBe(400);
    expect(invalidData.error).toBe('Invalid status transition');
    expect(invalidData.allowedTransitions).toEqual([]);

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('delivered');
  });

  it('should prevent transitions from cancelled status', async () => {
    // Set order to cancelled
    mockOrders[0].status = 'cancelled';

    // Try to transition from cancelled to confirmed (invalid)
    const invalidRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed'
        })
      }
    );

    const invalidResponse = await updateOrderStatusPUT(
      invalidRequest,
      { params: { id: 'order-1' } }
    );
    const invalidData = await invalidResponse.json();

    // Verify transition rejected
    expect(invalidResponse.status).toBe(400);
    expect(invalidData.error).toBe('Invalid status transition');
    expect(invalidData.allowedTransitions).toEqual([]);

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('cancelled');
  });

  it('should allow cancellation from pending, confirmed, and processing statuses', async () => {
    // Test cancellation from pending
    const cancelPendingRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled',
          adminNotes: 'Customer requested cancellation'
        })
      }
    );

    const cancelPendingResponse = await updateOrderStatusPUT(
      cancelPendingRequest,
      { params: { id: 'order-1' } }
    );

    expect(cancelPendingResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('cancelled');

    // Test cancellation from confirmed
    mockOrders[1].status = 'confirmed';
    const cancelConfirmedRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-2/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled'
        })
      }
    );

    const cancelConfirmedResponse = await updateOrderStatusPUT(
      cancelConfirmedRequest,
      { params: { id: 'order-2' } }
    );

    expect(cancelConfirmedResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-2')?.status).toBe('cancelled');

    // Test cancellation from processing
    mockOrders[0].status = 'processing';
    const cancelProcessingRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled'
        })
      }
    );

    const cancelProcessingResponse = await updateOrderStatusPUT(
      cancelProcessingRequest,
      { params: { id: 'order-1' } }
    );

    expect(cancelProcessingResponse.status).toBe(200);
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('cancelled');
  });

  it('should support polling with since parameter for real-time updates', async () => {
    // Initial fetch
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const initialResponse = await adminOrdersGET(initialRequest);
    const initialData = await initialResponse.json();

    expect(initialResponse.status).toBe(200);
    expect(initialData.orders.length).toBe(2);

    // Add a new order after the initial fetch
    const newOrderTime = new Date('2024-01-15T11:00:00Z').toISOString();
    mockOrders.push({
      id: 'order-3',
      order_id: 'SAVI-99999999',
      status: 'pending',
      quantity: 1,
      price: 7000,
      confirmed_price: null,
      admin_notes: null,
      contacted_at: null,
      phone: '9876543212',
      address_line1: '789 New Street',
      address_line2: null,
      city: 'Bangalore',
      state: 'Karnataka',
      postal_code: '560001',
      country: 'India',
      created_at: newOrderTime,
      updated_at: newOrderTime,
      user_id: 'user-789',
      variant_id: 'variant-3',
      user_profiles: {
        id: 'user-789',
        name: 'New Customer',
        email: 'new@example.com'
      },
      product_variants: {
        id: 'variant-3',
        color: 'Green',
        size: 'S',
        image_url: 'https://example.com/image3.jpg',
        product_id: 'product-3',
        products: {
          id: 'product-3',
          name: 'Traditional Banarasi Saree',
          category: 'Banarasi'
        }
      }
    });

    // Poll with since parameter (fetch orders created after initial fetch)
    const sinceTimestamp = new Date('2024-01-15T10:30:00Z').toISOString();
    const pollingRequest = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(sinceTimestamp)}`,
      {
        method: 'GET'
      }
    );

    const pollingResponse = await adminOrdersGET(pollingRequest);
    const pollingData = await pollingResponse.json();

    // Verify only new orders are returned
    expect(pollingResponse.status).toBe(200);
    expect(pollingData.orders.length).toBe(1);
    expect(pollingData.orders[0].orderId).toBe('SAVI-99999999');
  });

  it('should require admin authentication to view orders', async () => {
    // Mock unauthenticated user
    mockCurrentUser = null;

    const ordersRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const ordersResponse = await adminOrdersGET(ordersRequest);
    const ordersData = await ordersResponse.json();

    // Verify unauthorized error
    expect(ordersResponse.status).toBe(401);
    expect(ordersData.error).toBe('Unauthorized');
  });

  it('should require admin role to view orders (reject regular users)', async () => {
    // Mock regular user (not admin)
    mockCurrentUser = mockRegularUser;

    const ordersRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const ordersResponse = await adminOrdersGET(ordersRequest);
    const ordersData = await ordersResponse.json();

    // Verify forbidden error
    expect(ordersResponse.status).toBe(403);
    expect(ordersData.error).toBe('Forbidden');
  });

  it('should require admin authentication to update order status', async () => {
    // Mock unauthenticated user
    mockCurrentUser = null;

    const updateRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed'
        })
      }
    );

    const updateResponse = await updateOrderStatusPUT(
      updateRequest,
      { params: { id: 'order-1' } }
    );
    const updateData = await updateResponse.json();

    // Verify unauthorized error
    expect(updateResponse.status).toBe(401);
    expect(updateData.error).toBe('Unauthorized');

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('pending');
  });

  it('should require admin role to update order status (reject regular users)', async () => {
    // Mock regular user (not admin)
    mockCurrentUser = mockRegularUser;

    const updateRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed'
        })
      }
    );

    const updateResponse = await updateOrderStatusPUT(
      updateRequest,
      { params: { id: 'order-1' } }
    );
    const updateData = await updateResponse.json();

    // Verify forbidden error
    expect(updateResponse.status).toBe(403);
    expect(updateData.error).toBe('Forbidden');

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('pending');
  });

  it('should handle non-existent order gracefully', async () => {
    const updateRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/non-existent-order/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed'
        })
      }
    );

    const updateResponse = await updateOrderStatusPUT(
      updateRequest,
      { params: { id: 'non-existent-order' } }
    );
    const updateData = await updateResponse.json();

    // Verify not found error
    expect(updateResponse.status).toBe(404);
    expect(updateData.error).toBe('Order not found');
  });

  it('should validate input data when updating order status', async () => {
    const invalidRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'invalid-status' // Invalid status
        })
      }
    );

    const invalidResponse = await updateOrderStatusPUT(
      invalidRequest,
      { params: { id: 'order-1' } }
    );
    const invalidData = await invalidResponse.json();

    // Verify validation error
    expect(invalidResponse.status).toBe(400);
    expect(invalidData.error).toBe('Invalid input');

    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('pending');
  });

  it('should reject invalid admin password during login', async () => {
    const loginRequest = new NextRequest('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'wrong-password'
      })
    });

    const loginResponse = await adminLoginPOST(loginRequest);
    const loginData = await loginResponse.json();

    // Verify login failed
    expect(loginResponse.status).toBe(401);
    expect(loginData.error).toBe('Invalid password');
  });

  it('should reject same-status transitions (pending → pending)', async () => {
    const updateNotesRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'pending', // Same status - invalid transition
          adminNotes: 'Customer prefers evening delivery'
        })
      }
    );

    const updateNotesResponse = await updateOrderStatusPUT(
      updateNotesRequest,
      { params: { id: 'order-1' } }
    );

    // Verify same-status transition is rejected
    expect(updateNotesResponse.status).toBe(400);
    const responseData = await updateNotesResponse.json();
    expect(responseData.error).toBe('Invalid status transition');
    expect(responseData.message).toContain('Cannot transition from pending to pending');
    
    // Verify order status unchanged
    expect(mockOrders.find(o => o.id === 'order-1')?.status).toBe('pending');
  });

  it('should update confirmed price when confirming order', async () => {
    const confirmRequest = new NextRequest(
      'http://localhost:3000/api/admin/orders/order-1/status',
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'confirmed',
          confirmedPrice: 4500,
          adminNotes: 'Negotiated price with customer'
        })
      }
    );

    const confirmResponse = await updateOrderStatusPUT(
      confirmRequest,
      { params: { id: 'order-1' } }
    );

    expect(confirmResponse.status).toBe(200);
    
    const updatedOrder = mockOrders.find(o => o.id === 'order-1');
    expect(updatedOrder?.status).toBe('confirmed');
    expect(updatedOrder?.confirmed_price).toBe(4500);
    expect(updatedOrder?.admin_notes).toBe('Negotiated price with customer');
    expect(updatedOrder?.contacted_at).toBeDefined();
  });
});

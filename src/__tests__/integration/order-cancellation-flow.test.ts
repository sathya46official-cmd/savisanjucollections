import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as createOrderPOST } from '@/app/api/orders/create/route';
import { PUT as cancelOrderPUT } from '@/app/api/orders/[id]/cancel/route';
import { NextRequest } from 'next/server';

/**
 * Integration Test: Order Cancellation and Stock Restoration Flow
 * 
 * Tests the complete order cancellation flow:
 * 1. Place order
 * 2. Verify stock decremented
 * 3. Cancel order (before shipped)
 * 4. Verify order status='cancelled'
 * 5. Verify stock restored
 * 6. Attempt to cancel shipped order
 * 7. Verify cancellation rejected
 * 
 * Requirements: 2.31, 2.49, 2.85
 * 
 * **Validates: Requirements 2.31, 2.49, 2.85**
 */

// Mock data
let mockOrders: any[] = [];
let mockProductVariants: Map<string, any> = new Map();
let mockStockReservations: Map<string, number> = new Map();

// Mock authenticated user
const mockAuthenticatedUser = {
  userId: 'test-user-123',
  email: 'customer@example.com',
  role: 'user'
};

vi.mock('@/lib/auth/jwt', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockAuthenticatedUser)),
  signJWT: vi.fn((payload: any) => Promise.resolve('mock-jwt-token')),
  setAuthCookie: vi.fn(() => Promise.resolve()),
  verifyJWT: vi.fn(() => Promise.resolve(mockAuthenticatedUser))
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
            }))
          })),
          insert: vi.fn((data: any) => {
            const order = { 
              ...data, 
              id: `order-${mockOrders.length + 1}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            mockOrders.push(order);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => ({ data: order, error: null }))
              }))
            };
          }),
          update: vi.fn((data: any) => ({
            eq: vi.fn((field: string, value: string) => {
              const order = mockOrders.find(o => o.id === value);
              if (order) {
                Object.assign(order, data);
                return { error: null };
              }
              return { error: { message: 'Order not found' } };
            })
          }))
        };
      }

      if (table === 'product_variants') {
        return {
          select: vi.fn((fields?: string) => ({
            eq: vi.fn((field: string, value: string) => ({
              single: vi.fn(() => {
                const variant = mockProductVariants.get(value);
                if (variant) {
                  return { data: variant, error: null };
                }
                return { data: null, error: { message: 'Variant not found' } };
              })
            }))
          }))
        };
      }

      if (table === 'cart') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null }))
            }))
          }))
        };
      }

      if (table === 'user_profiles') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null }))
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
    rpc: vi.fn((functionName: string, params: any) => {
      if (functionName === 'reserve_stock') {
        const { p_variant_id, p_quantity } = params;
        const variant = mockProductVariants.get(p_variant_id);
        
        if (!variant) {
          return Promise.resolve({ data: false, error: { message: 'Variant not found' } });
        }

        // Check if enough stock is available
        if (variant.quantity >= p_quantity) {
          // Reserve stock atomically
          variant.quantity -= p_quantity;
          mockStockReservations.set(p_variant_id, (mockStockReservations.get(p_variant_id) || 0) + p_quantity);
          return Promise.resolve({ data: true, error: null });
        }

        // Insufficient stock
        return Promise.resolve({ data: false, error: null });
      }

      if (functionName === 'restore_stock') {
        const { p_variant_id, p_quantity } = params;
        const variant = mockProductVariants.get(p_variant_id);
        
        if (variant) {
          variant.quantity += p_quantity;
          mockStockReservations.set(p_variant_id, (mockStockReservations.get(p_variant_id) || 0) - p_quantity);
        }

        return Promise.resolve({ data: true, error: null });
      }

      return Promise.resolve({ data: null, error: { message: 'Unknown function' } });
    })
  }
}));

vi.mock('@/lib/email/resend', () => ({
  sendOrderConfirmationEmail: vi.fn(() => Promise.resolve()),
  sendAdminNotificationEmail: vi.fn(() => Promise.resolve())
}));

describe('Integration Test: Order Cancellation and Stock Restoration Flow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Use proper UUIDs for test data
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Reset mock data
    mockOrders = [];
    mockStockReservations.clear();

    // Setup product variants with stock
    mockProductVariants.clear();
    mockProductVariants.set(variant1Id, {
      id: variant1Id,
      product_id: 'a7b8c9d0-e1f2-4345-a678-9abcdef01234',
      color: 'Red',
      size: 'M',
      price: 5000,
      quantity: 10,
      image_url: 'https://example.com/image1.jpg'
    });
  });

  afterEach(() => {
    // Clean up
    mockOrders = [];
    mockStockReservations.clear();
    mockProductVariants.clear();
  });

  it('should complete the full order cancellation flow: place order → verify stock decremented → cancel order → verify stock restored', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Step 1: Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 2 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    const orderResponse = await createOrderPOST(orderRequest);
    const orderData = await orderResponse.json();

    // Verify order was placed successfully
    expect(orderResponse.status).toBe(200);
    expect(orderData.success).toBe(true);
    expect(orderData.orderId).toBeDefined();
    expect(orderData.itemsOrdered).toBe(1);

    // Step 2: Verify stock decremented
    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(8); // 10 - 2 = 8
    expect(mockStockReservations.get(variant1Id)).toBe(2);

    // Get the created order ID
    const createdOrder = mockOrders[0];
    expect(createdOrder).toBeDefined();
    expect(createdOrder.status).toBe('pending');
    expect(createdOrder.variant_id).toBe(variant1Id);
    expect(createdOrder.quantity).toBe(2);

    // Step 3: Cancel order (before shipped)
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Step 4: Verify order status='cancelled'
    expect(cancelResponse.status).toBe(200);
    expect(cancelData.success).toBe(true);
    expect(cancelData.message).toBe('Order cancelled successfully');
    expect(createdOrder.status).toBe('cancelled');

    // Step 5: Verify stock restored
    expect(variant1?.quantity).toBe(10); // 8 + 2 = 10 (restored)
    expect(mockStockReservations.get(variant1Id)).toBe(0); // Reservation removed
  });

  it('should reject cancellation of shipped order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Step 1: Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    const orderResponse = await createOrderPOST(orderRequest);
    const orderData = await orderResponse.json();

    expect(orderResponse.status).toBe(200);
    expect(orderData.success).toBe(true);

    // Get the created order
    const createdOrder = mockOrders[0];
    expect(createdOrder).toBeDefined();

    // Step 2: Manually update order status to 'shipped' (simulating admin action)
    createdOrder.status = 'shipped';

    // Step 3: Verify stock was decremented
    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(9); // 10 - 1 = 9

    // Step 4: Attempt to cancel shipped order
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Step 5: Verify cancellation rejected
    expect(cancelResponse.status).toBe(400);
    expect(cancelData.error).toBe('Cancellation not allowed');
    expect(cancelData.message).toContain('Cannot cancel order with status: shipped');

    // Step 6: Verify order status unchanged
    expect(createdOrder.status).toBe('shipped');

    // Step 7: Verify stock NOT restored (still 9)
    expect(variant1?.quantity).toBe(9);
  });

  it('should reject cancellation of delivered order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Update order status to 'delivered'
    createdOrder.status = 'delivered';

    // Attempt to cancel delivered order
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify cancellation rejected
    expect(cancelResponse.status).toBe(400);
    expect(cancelData.error).toBe('Cancellation not allowed');
    expect(cancelData.message).toContain('Cannot cancel order with status: delivered');
    expect(createdOrder.status).toBe('delivered');
  });

  it('should reject cancellation of already cancelled order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Cancel order first time
    const cancelRequest1 = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse1 = await cancelOrderPUT(cancelRequest1, { params: { id: createdOrder.id } });
    expect(cancelResponse1.status).toBe(200);
    expect(createdOrder.status).toBe('cancelled');

    // Attempt to cancel again
    const cancelRequest2 = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse2 = await cancelOrderPUT(cancelRequest2, { params: { id: createdOrder.id } });
    const cancelData2 = await cancelResponse2.json();

    // Verify second cancellation rejected
    expect(cancelResponse2.status).toBe(400);
    expect(cancelData2.error).toBe('Cancellation not allowed');
    expect(cancelData2.message).toContain('Cannot cancel order with status: cancelled');
  });

  it('should allow cancellation of pending order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 3 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];
    expect(createdOrder.status).toBe('pending');

    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(7); // 10 - 3 = 7

    // Cancel pending order
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify cancellation succeeded
    expect(cancelResponse.status).toBe(200);
    expect(cancelData.success).toBe(true);
    expect(createdOrder.status).toBe('cancelled');
    expect(variant1?.quantity).toBe(10); // Stock restored
  });

  it('should allow cancellation of confirmed order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 2 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Update order status to 'confirmed' (simulating admin action)
    createdOrder.status = 'confirmed';

    // Cancel confirmed order
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify cancellation succeeded
    expect(cancelResponse.status).toBe(200);
    expect(cancelData.success).toBe(true);
    expect(createdOrder.status).toBe('cancelled');
  });

  it('should allow cancellation of processing order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Update order status to 'processing' (simulating admin action)
    createdOrder.status = 'processing';

    // Cancel processing order
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify cancellation succeeded
    expect(cancelResponse.status).toBe(200);
    expect(cancelData.success).toBe(true);
    expect(createdOrder.status).toBe('cancelled');
  });

  it('should verify order ownership before cancellation', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Change order user_id to simulate different user
    createdOrder.user_id = 'different-user-456';

    // Attempt to cancel order as original user
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify cancellation rejected due to ownership mismatch
    expect(cancelResponse.status).toBe(403);
    expect(cancelData.error).toBe('Forbidden');
  });

  it('should return 404 for non-existent order', async () => {
    const nonExistentOrderId = 'order-999';

    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${nonExistentOrderId}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: nonExistentOrderId } });
    const cancelData = await cancelResponse.json();

    // Verify 404 error
    expect(cancelResponse.status).toBe(404);
    expect(cancelData.error).toBe('Order not found');
  });

  it('should require authentication to cancel order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(orderRequest);
    const createdOrder = mockOrders[0];

    // Mock unauthenticated user
    const { getCurrentUser } = await import('@/lib/auth/jwt');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    // Attempt to cancel order without authentication
    const cancelRequest = new NextRequest(`http://localhost:3000/api/orders/${createdOrder.id}/cancel`, {
      method: 'PUT'
    });

    const cancelResponse = await cancelOrderPUT(cancelRequest, { params: { id: createdOrder.id } });
    const cancelData = await cancelResponse.json();

    // Verify unauthorized error
    expect(cancelResponse.status).toBe(401);
    expect(cancelData.error).toBe('Unauthorized');
  });

  it('should handle stock restoration atomically', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Place multiple orders
    const order1Request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 3 }],
        address: {
          line1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    await createOrderPOST(order1Request);

    const order2Request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 2 }],
        address: {
          line1: '456 Another Street',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India'
        },
        phone: '9876543211'
      })
    });

    await createOrderPOST(order2Request);

    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(5); // 10 - 3 - 2 = 5

    // Cancel first order
    const order1 = mockOrders[0];
    const cancelRequest1 = new NextRequest(`http://localhost:3000/api/orders/${order1.id}/cancel`, {
      method: 'PUT'
    });

    await cancelOrderPUT(cancelRequest1, { params: { id: order1.id } });
    expect(variant1?.quantity).toBe(8); // 5 + 3 = 8

    // Cancel second order
    const order2 = mockOrders[1];
    const cancelRequest2 = new NextRequest(`http://localhost:3000/api/orders/${order2.id}/cancel`, {
      method: 'PUT'
    });

    await cancelOrderPUT(cancelRequest2, { params: { id: order2.id } });
    expect(variant1?.quantity).toBe(10); // 8 + 2 = 10 (fully restored)
  });
});

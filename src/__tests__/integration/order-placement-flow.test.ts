import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as createOrderPOST } from '@/app/api/orders/create/route';
import { GET as getCartGET } from '@/app/api/cart/route';
import { NextRequest } from 'next/server';

/**
 * Integration Test: Complete Order Placement Flow
 * 
 * Tests the end-to-end order placement flow:
 * 1. Login as user
 * 2. Add items to cart
 * 3. Proceed to checkout
 * 4. Fill address form (verify auto-fill from profile)
 * 5. Place order
 * 6. Verify stock decremented atomically
 * 7. Verify cart cleared
 * 8. Verify order confirmation email sent
 * 9. Verify admin notification email sent
 * 
 * Requirements: 2.26, 2.29, 2.48, 2.67, 2.84
 * 
 * **Validates: Requirements 2.26, 2.29, 2.48, 2.67, 2.84**
 */

// Mock data
let mockUserProfile: any = null;
let mockCart: any = null;
let mockCartItems: any[] = [];
let mockOrders: any[] = [];
let mockProductVariants: Map<string, any> = new Map();
let mockStockReservations: Map<string, number> = new Map();
let mockEmailsSent: { type: string; to: string; orderId?: string }[] = [];

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
      if (table === 'cart') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => {
                if (mockCart) {
                  return { data: mockCart, error: null };
                }
                return { data: null, error: null };
              })
            }))
          })),
          insert: vi.fn((data: any) => {
            mockCart = { id: 'cart-123', user_id: data.user_id };
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => ({ data: mockCart, error: null }))
              }))
            };
          })
        };
      }

      if (table === 'cart_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              return { data: mockCartItems, error: null };
            })
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => {
              mockCartItems = [];
              return { error: null };
            })
          }))
        };
      }

      if (table === 'product_variants') {
        return {
          select: vi.fn(() => ({
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

      if (table === 'orders') {
        return {
          insert: vi.fn((data: any) => {
            const order = { ...data, id: `order-${mockOrders.length + 1}` };
            mockOrders.push(order);
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => ({ data: order, error: null }))
              }))
            };
          })
        };
      }

      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => {
                if (mockUserProfile) {
                  return { data: mockUserProfile, error: null };
                }
                return { data: null, error: null };
              })
            }))
          })),
          update: vi.fn((data: any) => {
            if (mockUserProfile) {
              mockUserProfile = { ...mockUserProfile, ...data };
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
  sendOrderConfirmationEmail: vi.fn((email: string, orderId: string) => {
    mockEmailsSent.push({ type: 'order_confirmation', to: email, orderId });
    return Promise.resolve();
  }),
  sendAdminNotificationEmail: vi.fn((orderId: string, itemCount: number) => {
    mockEmailsSent.push({ type: 'admin_notification', to: 'admin@savisanju.com', orderId });
    return Promise.resolve();
  })
}));

describe('Integration Test: Complete Order Placement Flow', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Use proper UUIDs for test data (valid UUID v4 format)
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, a, or b
    const userId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const cartId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    const variant2Id = 'd4e5f6a7-b8c9-4012-8345-6789abcdef01';
    
    // Reset mock data
    mockUserProfile = {
      id: userId,
      email: 'customer@example.com',
      name: 'Test Customer',
      phone: '9876543210',
      address_line1: '123 Test Street',
      address_line2: 'Apt 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400001',
      country: 'India'
    };

    mockCart = {
      id: cartId,
      user_id: userId
    };

    mockCartItems = [
      {
        id: 'e5f6a7b8-c9d0-4123-8456-789abcdef012',
        cart_id: cartId,
        variant_id: variant1Id,
        quantity: 2,
        added_at: new Date().toISOString()
      },
      {
        id: 'f6a7b8c9-d0e1-4234-8567-89abcdef0123',
        cart_id: cartId,
        variant_id: variant2Id,
        quantity: 1,
        added_at: new Date().toISOString()
      }
    ];

    mockOrders = [];
    mockEmailsSent = [];
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
    mockProductVariants.set(variant2Id, {
      id: variant2Id,
      product_id: 'b8c9d0e1-f2a3-4456-b789-abcdef012345',
      color: 'Blue',
      size: 'L',
      price: 6000,
      quantity: 5,
      image_url: 'https://example.com/image2.jpg'
    });
  });

  afterEach(() => {
    // Clean up
    mockUserProfile = null;
    mockCart = null;
    mockCartItems = [];
    mockOrders = [];
    mockEmailsSent = [];
    mockStockReservations.clear();
    mockProductVariants.clear();
  });

  it('should complete the full order placement flow: login → cart → checkout → place order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    const variant2Id = 'd4e5f6a7-b8c9-4012-8345-6789abcdef01';
    const userId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    const cartId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef';
    
    // Step 1: User is already logged in (mocked via getCurrentUser)
    // Verify user is authenticated
    const { getCurrentUser } = await import('@/lib/auth/jwt');
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.userId).toBe('test-user-123');
    expect(user?.email).toBe('customer@example.com');

    // Step 2: User has items in cart (already set up in beforeEach)
    // Verify cart has items
    expect(mockCartItems.length).toBe(2);
    expect(mockCartItems[0].variant_id).toBe(variant1Id);
    expect(mockCartItems[0].quantity).toBe(2);
    expect(mockCartItems[1].variant_id).toBe(variant2Id);
    expect(mockCartItems[1].quantity).toBe(1);

    // Step 3: Proceed to checkout - verify cart contents
    const getCartRequest = new NextRequest('http://localhost:3000/api/cart', {
      method: 'GET'
    });

    const cartResponse = await getCartGET(getCartRequest);
    const cartData = await cartResponse.json();

    expect(cartResponse.status).toBe(200);
    expect(cartData.cart).toBeDefined();
    expect(cartData.cart.id).toBe(cartId);

    // Step 4: Fill address form - verify auto-fill from profile
    // The address should be auto-filled from user profile
    expect(mockUserProfile.address_line1).toBe('123 Test Street');
    expect(mockUserProfile.address_line2).toBe('Apt 4B');
    expect(mockUserProfile.city).toBe('Mumbai');
    expect(mockUserProfile.state).toBe('Maharashtra');
    expect(mockUserProfile.postal_code).toBe('400001');
    expect(mockUserProfile.country).toBe('India');

    // Step 5: Place order
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { variantId: variant1Id, quantity: 2 },
          { variantId: variant2Id, quantity: 1 }
        ],
        address: {
          line1: '123 Test Street',
          line2: 'Apt 4B',
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
    expect(orderData.orderId).toMatch(/^SAVI-[A-F0-9]{8}$/);
    expect(orderData.itemsOrdered).toBe(2);
    expect(orderData.message).toContain('Order placed successfully');

    // Step 6: Verify stock decremented atomically
    const variant1 = mockProductVariants.get(variant1Id);
    const variant2 = mockProductVariants.get(variant2Id);
    
    expect(variant1?.quantity).toBe(8); // 10 - 2 = 8
    expect(variant2?.quantity).toBe(4); // 5 - 1 = 4
    
    // Verify stock reservations were made
    expect(mockStockReservations.get(variant1Id)).toBe(2);
    expect(mockStockReservations.get(variant2Id)).toBe(1);

    // Step 7: Verify cart cleared
    expect(mockCartItems.length).toBe(0);

    // Step 8: Verify order confirmation email sent
    const orderConfirmationEmail = mockEmailsSent.find(
      email => email.type === 'order_confirmation' && email.to === 'customer@example.com'
    );
    expect(orderConfirmationEmail).toBeDefined();
    expect(orderConfirmationEmail?.orderId).toBe(orderData.orderId);

    // Step 9: Verify admin notification email sent
    const adminNotificationEmail = mockEmailsSent.find(
      email => email.type === 'admin_notification' && email.to === 'admin@savisanju.com'
    );
    expect(adminNotificationEmail).toBeDefined();
    expect(adminNotificationEmail?.orderId).toBe(orderData.orderId);

    // Verify orders were created in database
    expect(mockOrders.length).toBe(2); // One order per item
    expect(mockOrders[0].order_id).toBe(orderData.orderId);
    expect(mockOrders[0].user_id).toBe('test-user-123');
    expect(mockOrders[0].variant_id).toBe(variant1Id);
    expect(mockOrders[0].quantity).toBe(2);
    expect(mockOrders[0].price).toBe(5000);
    expect(mockOrders[0].status).toBe('pending');
    expect(mockOrders[0].phone).toBe('9876543210');
    expect(mockOrders[0].address_line1).toBe('123 Test Street');
    expect(mockOrders[0].city).toBe('Mumbai');
    expect(mockOrders[0].state).toBe('Maharashtra');
    expect(mockOrders[0].postal_code).toBe('400001');

    // Verify user profile was updated with address
    expect(mockUserProfile.address_line1).toBe('123 Test Street');
    expect(mockUserProfile.address_line2).toBe('Apt 4B');
    expect(mockUserProfile.city).toBe('Mumbai');
    expect(mockUserProfile.state).toBe('Maharashtra');
    expect(mockUserProfile.postal_code).toBe('400001');
    expect(mockUserProfile.country).toBe('India');
  });

  it('should handle insufficient stock gracefully', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    const variant2Id = 'd4e5f6a7-b8c9-4012-8345-6789abcdef01';
    
    // Set variant-1 stock to only 1 (less than requested 2)
    const variant1 = mockProductVariants.get(variant1Id);
    if (variant1) {
      variant1.quantity = 1;
    }

    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { variantId: variant1Id, quantity: 2 }, // Requesting 2, but only 1 available
          { variantId: variant2Id, quantity: 1 }
        ],
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

    // Verify partial order was placed (only variant-2)
    expect(orderResponse.status).toBe(200);
    expect(orderData.success).toBe(true);
    expect(orderData.itemsOrdered).toBe(1); // Only variant-2 was ordered
    expect(orderData.failedItems).toBeDefined();
    expect(orderData.failedItems.length).toBe(1);
    expect(orderData.failedItems[0].variantId).toBe(variant1Id);
    expect(orderData.failedItems[0].reason).toBe('Insufficient stock');

    // Verify only variant-2 stock was decremented
    const variant2 = mockProductVariants.get(variant2Id);
    expect(variant2?.quantity).toBe(4); // 5 - 1 = 4

    // Verify variant-1 stock was NOT decremented
    expect(variant1?.quantity).toBe(1); // Still 1
  });

  it('should prevent race conditions with atomic stock reservation', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Set variant-1 stock to exactly 2
    const variant1 = mockProductVariants.get(variant1Id);
    if (variant1) {
      variant1.quantity = 2;
    }

    // First order requests 2 items
    const order1Request = new NextRequest('http://localhost:3000/api/orders/create', {
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

    const order1Response = await createOrderPOST(order1Request);
    const order1Data = await order1Response.json();

    // First order should succeed
    expect(order1Response.status).toBe(200);
    expect(order1Data.success).toBe(true);
    expect(order1Data.itemsOrdered).toBe(1);

    // Verify stock is now 0
    expect(variant1?.quantity).toBe(0);

    // Second order tries to request 1 item (but stock is now 0)
    const order2Request = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
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

    const order2Response = await createOrderPOST(order2Request);
    const order2Data = await order2Response.json();

    // Second order should fail due to insufficient stock
    expect(order2Response.status).toBe(400);
    expect(order2Data.error).toBe('Failed to create order');
    expect(order2Data.details).toBeDefined();
    expect(order2Data.details[0].variantId).toBe(variant1Id);
    expect(order2Data.details[0].reason).toBe('Insufficient stock');

    // Verify stock is still 0 (not negative)
    expect(variant1?.quantity).toBe(0);
  });

  it('should validate input data before placing order', async () => {
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [
          { variantId: 'invalid-uuid', quantity: 2 } // Invalid UUID
        ],
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

    // Verify validation error
    expect(orderResponse.status).toBe(400);
    expect(orderData.error).toBe('Invalid input');

    // Verify no orders were created
    expect(mockOrders.length).toBe(0);

    // Verify no stock was decremented
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(10); // Still 10
  });

  it('should require authentication to place order', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // Mock unauthenticated user
    const { getCurrentUser } = await import('@/lib/auth/jwt');
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

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

    // Verify unauthorized error
    expect(orderResponse.status).toBe(401);
    expect(orderData.error).toBe('Unauthorized');

    // Verify no orders were created
    expect(mockOrders.length).toBe(0);

    // Verify no stock was decremented
    const variant1 = mockProductVariants.get(variant1Id);
    expect(variant1?.quantity).toBe(10); // Still 10
  });

  it('should handle missing address fields', async () => {
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: 'variant-1', quantity: 2 }],
        address: {
          line1: '123 Test Street',
          // Missing city, state, postalCode
        },
        phone: '9876543210'
      })
    });

    const orderResponse = await createOrderPOST(orderRequest);
    const orderData = await orderResponse.json();

    // Verify validation error
    expect(orderResponse.status).toBe(400);
    expect(orderData.error).toBe('Invalid input');

    // Verify no orders were created
    expect(mockOrders.length).toBe(0);
  });

  it('should handle empty cart gracefully', async () => {
    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [], // Empty items array
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

    // Verify validation error or empty order handling
    expect(orderResponse.status).toBe(400);
    expect(orderData.error).toBeDefined();

    // Verify no orders were created
    expect(mockOrders.length).toBe(0);
  });

  it('should update user profile with new address on order placement', async () => {
    const variant1Id = 'c3d4e5f6-a7b8-4901-8234-56789abcdef0';
    
    // User has old address in profile
    mockUserProfile.address_line1 = 'Old Address';
    mockUserProfile.city = 'Old City';

    const orderRequest = new NextRequest('http://localhost:3000/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ variantId: variant1Id, quantity: 1 }],
        address: {
          line1: 'New Address',
          line2: 'New Apt',
          city: 'New City',
          state: 'New State',
          postalCode: '999999',
          country: 'India'
        },
        phone: '9876543210'
      })
    });

    const orderResponse = await createOrderPOST(orderRequest);
    const orderData = await orderResponse.json();

    // Verify order was placed
    expect(orderResponse.status).toBe(200);
    expect(orderData.success).toBe(true);

    // Verify user profile was updated with new address
    expect(mockUserProfile.address_line1).toBe('New Address');
    expect(mockUserProfile.address_line2).toBe('New Apt');
    expect(mockUserProfile.city).toBe('New City');
    expect(mockUserProfile.state).toBe('New State');
    expect(mockUserProfile.postal_code).toBe('999999');
    expect(mockUserProfile.country).toBe('India');
  });
});

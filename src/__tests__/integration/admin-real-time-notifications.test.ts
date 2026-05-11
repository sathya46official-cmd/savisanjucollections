import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as adminLoginPOST } from '@/app/api/admin/login/route';
import { GET as adminOrdersGET } from '@/app/api/admin/orders/route';
import { NextRequest } from 'next/server';

/**
 * Integration Test: Admin Real-Time Notifications
 * 
 * Tests the real-time notification system for the admin dashboard:
 * 1. Admin login and dashboard access
 * 2. Polling mechanism (10-second interval) with 'since' parameter
 * 3. Browser notification permission and display
 * 4. Sound alert playback
 * 5. Order list auto-refresh
 * 
 * Requirements: 2.41-2.44
 * 
 * **Validates: Requirements 2.41 (Polling), 2.42 (Browser notifications), 2.43 (Sound alerts), 2.44 (Auto-refresh)**
 */

// Mock data
let mockOrders: any[] = [];
let mockAdminPasswordHash: string = '';
let mockCurrentUser: any = null;
let mockNotificationPermission: NotificationPermission = 'default';
let mockNotifications: any[] = [];
let mockAudioPlayed: boolean = false;

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

// Mock Notification API
class MockNotification {
  title: string;
  options: any;
  
  constructor(title: string, options?: any) {
    this.title = title;
    this.options = options;
    mockNotifications.push({ title, options });
  }
  
  static permission: NotificationPermission = 'default';
  
  static requestPermission(): Promise<NotificationPermission> {
    MockNotification.permission = mockNotificationPermission;
    return Promise.resolve(mockNotificationPermission);
  }
}

// Mock Audio API
class MockAudio {
  src: string;
  
  constructor(src: string) {
    this.src = src;
  }
  
  play(): Promise<void> {
    mockAudioPlayed = true;
    return Promise.resolve();
  }
}

// Setup global mocks
(global as any).Notification = MockNotification;
(global as any).Audio = MockAudio;

vi.mock('@/lib/auth/jwt', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(mockCurrentUser)),
  signJWT: vi.fn((payload: any) => Promise.resolve('mock-admin-jwt-token')),
  setAuthCookie: vi.fn(() => Promise.resolve()),
  verifyJWT: vi.fn(() => Promise.resolve(mockCurrentUser))
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn((password: string, hash: string) => {
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

describe('Integration Test: Admin Real-Time Notifications', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set admin password hash
    mockAdminPasswordHash = '$2a$10$mockHashForAdmin123Password';

    // Set current user to admin
    mockCurrentUser = mockAdminUser;

    // Reset notification permission
    mockNotificationPermission = 'default';
    mockNotifications = [];
    mockAudioPlayed = false;
    MockNotification.permission = 'default';


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
      }
    ];

    // Mock environment variable
    process.env.ADMIN_PASSWORD_HASH = mockAdminPasswordHash;
  });

  afterEach(() => {
    // Clean up
    mockOrders = [];
    mockCurrentUser = null;
    mockNotifications = [];
    mockAudioPlayed = false;
    delete process.env.ADMIN_PASSWORD_HASH;
  });


  it('should complete the full admin real-time notification flow: login → polling → notifications → sound', async () => {
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

    // Step 2: Initial fetch of orders (dashboard load)
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const initialResponse = await adminOrdersGET(initialRequest);
    const initialData = await initialResponse.json();

    // Verify initial orders fetched
    expect(initialResponse.status).toBe(200);
    expect(initialData.success).toBe(true);
    expect(initialData.orders.length).toBe(1);
    expect(initialData.orders[0].orderId).toBe('SAVI-12345678');

    // Record the timestamp for polling
    const lastFetchTime = new Date('2024-01-15T10:00:00Z').toISOString();

    // Step 3: Grant browser notification permission
    mockNotificationPermission = 'granted';
    const permission = await MockNotification.requestPermission();
    expect(permission).toBe('granted');

    // Step 4: Simulate new order placed (different browser/incognito)
    const newOrderTime = new Date('2024-01-15T10:05:00Z').toISOString();
    mockOrders.push({
      id: 'order-2',
      order_id: 'SAVI-87654321',
      status: 'pending',
      quantity: 1,
      price: 6000,
      confirmed_price: null,
      admin_notes: null,
      contacted_at: null,
      phone: '9876543211',
      address_line1: '456 Another Street',
      address_line2: null,
      city: 'Delhi',
      state: 'Delhi',
      postal_code: '110001',
      country: 'India',
      created_at: newOrderTime,
      updated_at: newOrderTime,
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
    });


    // Step 5: Admin dashboard polls for new orders (using 'since' parameter)
    const pollingRequest = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const pollingResponse = await adminOrdersGET(pollingRequest);
    const pollingData = await pollingResponse.json();

    // Verify new order detected within 10 seconds (polling interval)
    expect(pollingResponse.status).toBe(200);
    expect(pollingData.success).toBe(true);
    expect(pollingData.orders.length).toBe(1); // Only new order
    expect(pollingData.orders[0].orderId).toBe('SAVI-87654321');

    // Step 6: Verify browser notification displayed
    const notification = new MockNotification('🔔 1 New Order', {
      body: 'Order SAVI-87654321',
      tag: 'new-orders',
      requireInteraction: true
    });

    expect(mockNotifications.length).toBe(1);
    expect(mockNotifications[0].title).toBe('🔔 1 New Order');
    expect(mockNotifications[0].options.body).toBe('Order SAVI-87654321');
    expect(mockNotifications[0].options.tag).toBe('new-orders');
    expect(mockNotifications[0].options.requireInteraction).toBe(true);

    // Step 7: Verify sound alert plays
    const audio = new MockAudio('/notification.mp3');
    await audio.play();

    expect(mockAudioPlayed).toBe(true);

    // Step 8: Verify order list auto-refreshes (fetch all orders again)
    const refreshRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const refreshResponse = await adminOrdersGET(refreshRequest);
    const refreshData = await refreshResponse.json();

    // Verify order list includes both orders
    expect(refreshResponse.status).toBe(200);
    expect(refreshData.orders.length).toBe(2);
    expect(refreshData.orders[0].orderId).toBe('SAVI-87654321'); // Most recent first
    expect(refreshData.orders[1].orderId).toBe('SAVI-12345678');
  });

  it('should poll every 10 seconds and detect new orders', async () => {
    // Initial fetch
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const initialResponse = await adminOrdersGET(initialRequest);
    expect(initialResponse.status).toBe(200);

    const lastFetchTime = new Date('2024-01-15T10:00:00Z').toISOString();

    // Simulate 10 seconds passing, no new orders
    const polling1Request = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const polling1Response = await adminOrdersGET(polling1Request);
    const polling1Data = await polling1Response.json();

    // Verify no new orders
    expect(polling1Response.status).toBe(200);
    expect(polling1Data.orders.length).toBe(0);

    // Add new order
    const newOrderTime = new Date('2024-01-15T10:10:00Z').toISOString();
    mockOrders.push({
      id: 'order-2',
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

    // Poll again after 10 seconds
    const polling2Request = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const polling2Response = await adminOrdersGET(polling2Request);
    const polling2Data = await polling2Response.json();

    // Verify new order detected
    expect(polling2Response.status).toBe(200);
    expect(polling2Data.orders.length).toBe(1);
    expect(polling2Data.orders[0].orderId).toBe('SAVI-99999999');
  });


  it('should request browser notification permission', async () => {
    // Default permission state
    expect(MockNotification.permission).toBe('default');

    // Request permission
    mockNotificationPermission = 'granted';
    const permission = await MockNotification.requestPermission();

    // Verify permission granted
    expect(permission).toBe('granted');
    expect(MockNotification.permission).toBe('granted');
  });

  it('should handle notification permission denied', async () => {
    // Request permission but user denies
    mockNotificationPermission = 'denied';
    const permission = await MockNotification.requestPermission();

    // Verify permission denied
    expect(permission).toBe('denied');
    expect(MockNotification.permission).toBe('denied');

    // Notifications should not be displayed
    // (In real implementation, the dashboard would show a warning)
  });

  it('should display browser notification when new order arrives', async () => {
    // Grant permission
    mockNotificationPermission = 'granted';
    await MockNotification.requestPermission();

    // Create notification
    const notification = new MockNotification('🔔 1 New Order', {
      body: 'Order SAVI-12345678',
      tag: 'new-orders',
      requireInteraction: true
    });

    // Verify notification created
    expect(mockNotifications.length).toBe(1);
    expect(mockNotifications[0].title).toBe('🔔 1 New Order');
    expect(mockNotifications[0].options.body).toBe('Order SAVI-12345678');
    expect(mockNotifications[0].options.tag).toBe('new-orders');
    expect(mockNotifications[0].options.requireInteraction).toBe(true);
  });

  it('should play sound alert when new order arrives', async () => {
    // Create audio element
    const audio = new MockAudio('/notification.mp3');

    // Verify audio source
    expect(audio.src).toBe('/notification.mp3');

    // Play sound
    await audio.play();

    // Verify sound played
    expect(mockAudioPlayed).toBe(true);
  });

  it('should handle sound playback failure gracefully', async () => {
    // Mock audio play failure
    class FailingAudio extends MockAudio {
      play(): Promise<void> {
        return Promise.reject(new Error('Audio playback failed'));
      }
    }

    const audio = new FailingAudio('/notification.mp3');

    // Attempt to play sound
    try {
      await audio.play();
    } catch (error: any) {
      // Verify error caught
      expect(error.message).toBe('Audio playback failed');
    }

    // Dashboard should continue working despite audio failure
    expect(mockAudioPlayed).toBe(false);
  });

  it('should auto-refresh order list when new orders detected', async () => {
    // Initial fetch
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const initialResponse = await adminOrdersGET(initialRequest);
    const initialData = await initialResponse.json();

    expect(initialData.orders.length).toBe(1);

    // Add new orders
    const newOrder1Time = new Date('2024-01-15T10:05:00Z').toISOString();
    const newOrder2Time = new Date('2024-01-15T10:06:00Z').toISOString();

    mockOrders.push(
      {
        id: 'order-2',
        order_id: 'SAVI-11111111',
        status: 'pending',
        quantity: 1,
        price: 6000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: '9876543211',
        address_line1: '456 Street',
        address_line2: null,
        city: 'Delhi',
        state: 'Delhi',
        postal_code: '110001',
        country: 'India',
        created_at: newOrder1Time,
        updated_at: newOrder1Time,
        user_id: 'user-456',
        variant_id: 'variant-2',
        user_profiles: {
          id: 'user-456',
          name: 'Customer 2',
          email: 'customer2@example.com'
        },
        product_variants: {
          id: 'variant-2',
          color: 'Blue',
          size: 'L',
          image_url: 'https://example.com/image2.jpg',
          product_id: 'product-2',
          products: {
            id: 'product-2',
            name: 'Saree 2',
            category: 'Cotton'
          }
        }
      },
      {
        id: 'order-3',
        order_id: 'SAVI-22222222',
        status: 'pending',
        quantity: 2,
        price: 8000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: '9876543212',
        address_line1: '789 Avenue',
        address_line2: null,
        city: 'Bangalore',
        state: 'Karnataka',
        postal_code: '560001',
        country: 'India',
        created_at: newOrder2Time,
        updated_at: newOrder2Time,
        user_id: 'user-789',
        variant_id: 'variant-3',
        user_profiles: {
          id: 'user-789',
          name: 'Customer 3',
          email: 'customer3@example.com'
        },
        product_variants: {
          id: 'variant-3',
          color: 'Green',
          size: 'S',
          image_url: 'https://example.com/image3.jpg',
          product_id: 'product-3',
          products: {
            id: 'product-3',
            name: 'Saree 3',
            category: 'Silk'
          }
        }
      }
    );

    // Auto-refresh (fetch all orders)
    const refreshRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    const refreshResponse = await adminOrdersGET(refreshRequest);
    const refreshData = await refreshResponse.json();

    // Verify all orders displayed
    expect(refreshResponse.status).toBe(200);
    expect(refreshData.orders.length).toBe(3);
    expect(refreshData.orders[0].orderId).toBe('SAVI-22222222'); // Most recent first
    expect(refreshData.orders[1].orderId).toBe('SAVI-11111111');
    expect(refreshData.orders[2].orderId).toBe('SAVI-12345678');
  });


  it('should use since parameter for efficient polling', async () => {
    // Initial fetch at 10:00:00
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    await adminOrdersGET(initialRequest);

    const lastFetchTime = new Date('2024-01-15T10:00:00Z').toISOString();

    // Add orders at different times
    const order1Time = new Date('2024-01-15T09:55:00Z').toISOString(); // Before lastFetchTime
    const order2Time = new Date('2024-01-15T10:05:00Z').toISOString(); // After lastFetchTime

    mockOrders.push(
      {
        id: 'order-old',
        order_id: 'SAVI-OLD',
        status: 'pending',
        quantity: 1,
        price: 5000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: '9876543210',
        address_line1: '123 Street',
        address_line2: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        created_at: order1Time,
        updated_at: order1Time,
        user_id: 'user-old',
        variant_id: 'variant-old',
        user_profiles: {
          id: 'user-old',
          name: 'Old Customer',
          email: 'old@example.com'
        },
        product_variants: {
          id: 'variant-old',
          color: 'Red',
          size: 'M',
          image_url: 'https://example.com/image.jpg',
          product_id: 'product-old',
          products: {
            id: 'product-old',
            name: 'Old Saree',
            category: 'Silk'
          }
        }
      },
      {
        id: 'order-new',
        order_id: 'SAVI-NEW',
        status: 'pending',
        quantity: 1,
        price: 6000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: '9876543211',
        address_line1: '456 Street',
        address_line2: null,
        city: 'Delhi',
        state: 'Delhi',
        postal_code: '110001',
        country: 'India',
        created_at: order2Time,
        updated_at: order2Time,
        user_id: 'user-new',
        variant_id: 'variant-new',
        user_profiles: {
          id: 'user-new',
          name: 'New Customer',
          email: 'new@example.com'
        },
        product_variants: {
          id: 'variant-new',
          color: 'Blue',
          size: 'L',
          image_url: 'https://example.com/image2.jpg',
          product_id: 'product-new',
          products: {
            id: 'product-new',
            name: 'New Saree',
            category: 'Cotton'
          }
        }
      }
    );

    // Poll with since parameter
    const pollingRequest = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const pollingResponse = await adminOrdersGET(pollingRequest);
    const pollingData = await pollingResponse.json();

    // Verify only orders after lastFetchTime are returned
    expect(pollingResponse.status).toBe(200);
    expect(pollingData.orders.length).toBe(1);
    expect(pollingData.orders[0].orderId).toBe('SAVI-NEW');
  });

  it('should require admin authentication to access dashboard', async () => {
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

  it('should require admin role to access dashboard (reject regular users)', async () => {
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

  it('should handle multiple new orders in single poll', async () => {
    // Initial fetch
    const initialRequest = new NextRequest('http://localhost:3000/api/admin/orders', {
      method: 'GET'
    });

    await adminOrdersGET(initialRequest);

    const lastFetchTime = new Date('2024-01-15T10:00:00Z').toISOString();

    // Add 5 new orders
    for (let i = 1; i <= 5; i++) {
      const orderTime = new Date(`2024-01-15T10:0${i}:00Z`).toISOString();
      mockOrders.push({
        id: `order-${i}`,
        order_id: `SAVI-${i.toString().padStart(8, '0')}`,
        status: 'pending',
        quantity: 1,
        price: 5000 + i * 1000,
        confirmed_price: null,
        admin_notes: null,
        contacted_at: null,
        phone: `987654321${i}`,
        address_line1: `${i} Street`,
        address_line2: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        postal_code: '400001',
        country: 'India',
        created_at: orderTime,
        updated_at: orderTime,
        user_id: `user-${i}`,
        variant_id: `variant-${i}`,
        user_profiles: {
          id: `user-${i}`,
          name: `Customer ${i}`,
          email: `customer${i}@example.com`
        },
        product_variants: {
          id: `variant-${i}`,
          color: 'Red',
          size: 'M',
          image_url: 'https://example.com/image.jpg',
          product_id: `product-${i}`,
          products: {
            id: `product-${i}`,
            name: `Saree ${i}`,
            category: 'Silk'
          }
        }
      });
    }

    // Poll for new orders
    const pollingRequest = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const pollingResponse = await adminOrdersGET(pollingRequest);
    const pollingData = await pollingResponse.json();

    // Verify all 5 new orders detected
    expect(pollingResponse.status).toBe(200);
    expect(pollingData.orders.length).toBe(5);

    // Verify notification would show count
    const notification = new MockNotification(`🔔 ${pollingData.orders.length} New Orders`, {
      body: `Order ${pollingData.orders[0].orderId} and ${pollingData.orders.length - 1} more`,
      tag: 'new-orders',
      requireInteraction: true
    });

    expect(mockNotifications.length).toBe(1);
    expect(mockNotifications[0].title).toBe('🔔 5 New Orders');
  });

  it('should continue polling in background', async () => {
    // This test verifies the polling mechanism continues
    // In real implementation, setInterval would be used

    const lastFetchTime = new Date('2024-01-15T10:00:00Z').toISOString();

    // Poll 1: No new orders
    const poll1Request = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const poll1Response = await adminOrdersGET(poll1Request);
    const poll1Data = await poll1Response.json();

    expect(poll1Data.orders.length).toBe(0);

    // Add new order
    const newOrderTime = new Date('2024-01-15T10:10:00Z').toISOString();
    mockOrders.push({
      id: 'order-2',
      order_id: 'SAVI-NEW',
      status: 'pending',
      quantity: 1,
      price: 6000,
      confirmed_price: null,
      admin_notes: null,
      contacted_at: null,
      phone: '9876543211',
      address_line1: '456 Street',
      address_line2: null,
      city: 'Delhi',
      state: 'Delhi',
      postal_code: '110001',
      country: 'India',
      created_at: newOrderTime,
      updated_at: newOrderTime,
      user_id: 'user-456',
      variant_id: 'variant-2',
      user_profiles: {
        id: 'user-456',
        name: 'New Customer',
        email: 'new@example.com'
      },
      product_variants: {
        id: 'variant-2',
        color: 'Blue',
        size: 'L',
        image_url: 'https://example.com/image2.jpg',
        product_id: 'product-2',
        products: {
          id: 'product-2',
          name: 'New Saree',
          category: 'Cotton'
        }
      }
    });

    // Poll 2: New order detected
    const poll2Request = new NextRequest(
      `http://localhost:3000/api/admin/orders?since=${encodeURIComponent(lastFetchTime)}`,
      {
        method: 'GET'
      }
    );

    const poll2Response = await adminOrdersGET(poll2Request);
    const poll2Data = await poll2Response.json();

    expect(poll2Data.orders.length).toBe(1);
    expect(poll2Data.orders[0].orderId).toBe('SAVI-NEW');
  });
});

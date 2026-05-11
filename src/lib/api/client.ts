/**
 * API Client for SaviSanju Collections
 * Replaces Supabase client - talks directly to Express backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Include cookies for auth
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        return { data: null, error: new Error(error.error || error.message || 'Request failed') };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Products
  async getProducts(featured?: boolean) {
    const endpoint = featured ? '/api/products?featured=true' : '/api/products';
    return this.request<any[]>(endpoint);
  }

  async getProduct(id: string) {
    return this.request<any>(`/api/products/${id}`);
  }

  async getProductVariants(productId: string) {
    return this.request<any[]>(`/api/products/${productId}/variants`);
  }

  async getVariant(variantId: string) {
    return this.request<any>(`/api/products/variants/${variantId}`);
  }

  async getAllVariants() {
    return this.request<any[]>('/api/products/variants/all');
  }

  // Cart
  async getCart() {
    return this.request<any>('/api/cart');
  }

  async addToCart(variantId: string, quantity: number) {
    return this.request('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ variant_id: variantId, quantity }),
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request('/api/cart/update', {
      method: 'PUT',
      body: JSON.stringify({ item_id: itemId, quantity }),
    });
  }

  async removeFromCart(itemId: string) {
    return this.request('/api/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ item_id: itemId }),
    });
  }

  // Orders
  async createOrder(orderData: any) {
    return this.request('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrderHistory() {
    return this.request<any[]>('/api/orders/history');
  }

  async cancelOrder(orderId: string) {
    return this.request(`/api/orders/${orderId}/cancel`, {
      method: 'PUT',
    });
  }

  // Stock notifications
  async requestStockNotification(variantId: string, email: string) {
    return this.request('/api/stock/notify', {
      method: 'POST',
      body: JSON.stringify({ variant_id: variantId, email }),
    });
  }

  // Admin
  async adminLogin(email: string, password: string) {
    return this.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Product Management
  async createProduct(data: {
    name: string;
    description?: string;
    category?: string;
    featured?: boolean;
    display_order?: number;
  }) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    featured?: boolean;
    display_order?: number;
  }) {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Variant Management
  async createVariant(productId: string, data: {
    color: string;
    hex_code: string;
    size?: string;
    price: number;
    quantity?: number;
    is_negotiable?: boolean;
    image_url?: string;
  }) {
    return this.request(`/api/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVariant(variantId: string, data: {
    color?: string;
    hex_code?: string;
    size?: string;
    price?: number;
    quantity?: number;
    is_negotiable?: boolean;
    image_url?: string;
  }) {
    return this.request(`/api/products/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVariant(variantId: string) {
    return this.request(`/api/products/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  // Order Management
  async getAdminOrders(status?: string) {
    const endpoint = status ? `/api/admin/orders?status=${status}` : '/api/admin/orders';
    return this.request<any[]>(endpoint);
  }

  async getOrder(orderId: string) {
    return this.request<any>(`/api/admin/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    return this.request(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Stock Management
  async updateStock(variantId: string, quantity: number) {
    return this.request(`/api/admin/stock/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ stock_quantity: quantity }),
    });
  }

  // Image Upload
  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch(`${this.baseURL}/api/admin/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        return { data: null, error: new Error(error.error || 'Upload failed') };
      }

      const data = await response.json();
      return { data: data.urls, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Auth
  async register(userData: any) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async verifyEmail(token: string) {
    return this.request(`/api/auth/verify-email?token=${token}`);
  }
}

export const apiClient = new APIClient(API_URL);

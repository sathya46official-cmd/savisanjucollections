'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

// Types for API responses
export interface Product {
  id: string;
  name: string;
  description: string;
  variants?: Variant[];
}

export interface Variant {
  id: string;
  product_id: string;
  color: string;
  color_name?: string; // Alias for compatibility
  hex_code?: string;
  image_url: string;
  additional_images?: string[];
  price?: number;
  is_negotiable?: boolean;
  stock_status?: string;
  quantity?: number;
  description?: string;
}

/**
 * Hook to fetch products with their variants and expose basic CRUD utilities.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.getProducts();
    if (error) {
      console.error('Failed to fetch products:', error);
    } else if (data) {
      // Raw shapes returned by the backend before normalization
      interface RawVariant {
        color: string;
        hex_code?: string;
        quantity?: number;
        [key: string]: unknown;
      }
      interface RawProduct {
        variants?: RawVariant[];
        [key: string]: unknown;
      }
      // Transform data to match expected format
      const transformedProducts = (data as RawProduct[]).map((p) => ({
        ...p,
        product_variants: p.variants?.map((v) => ({
          ...v,
          color_name: v.color,
          hex_code: v.hex_code || '#000000',
          stock_status: (v.quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
        })),
      }));
      setProducts(transformedProducts as unknown as Product[]);
    }
    setLoading(false);
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    // TODO: Implement delete in backend API
    console.warn('Delete product not implemented in API yet');
    // For now, just remove from local state
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    // Mount-time data fetch; setState happens inside the async loader.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, fetchProducts, deleteProduct } as const;
}

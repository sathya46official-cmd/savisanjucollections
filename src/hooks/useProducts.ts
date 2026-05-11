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
      // Transform data to match expected format
      const transformedProducts = data.map((p: any) => ({
        ...p,
        product_variants: p.variants?.map((v: any) => ({
          ...v,
          color_name: v.color,
          hex_code: v.hex_code || '#000000',
          stock_status: v.quantity > 0 ? 'in_stock' : 'out_of_stock',
        })),
      }));
      setProducts(transformedProducts as Product[]);
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
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, fetchProducts, deleteProduct } as const;
}

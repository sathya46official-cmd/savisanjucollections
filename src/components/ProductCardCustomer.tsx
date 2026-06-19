"use client";

import { useState } from "react";
import { ShoppingCart, Bell, AlertCircle } from "lucide-react";
import { resolveImageUrl, handleImageError } from "@/lib/images";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ProductVariant {
  id: string;
  product_id: string;
  color_name: string;
  hex_code: string;
  image_url: string;
  price: number;
  quantity: number; // Stock quantity
  is_negotiable: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  product_variants: ProductVariant[];
}

interface ProductCardCustomerProps {
  product: Product;
  onAddToCart?: (variantId: string) => void;
}

export default function ProductCardCustomer({ product, onAddToCart }: ProductCardCustomerProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.product_variants?.[0] || null
  );
  const [notifying, setNotifying] = useState(false);

  /**
   * Add to cart
   */
  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    if (selectedVariant.quantity === 0) {
      alert('This item is out of stock');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/cart/add`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          quantity: 1
        })
      });

      if (response.status === 401) {
        // Not authenticated - redirect to login
        window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to cart');
      }

      // Success
      if (onAddToCart) {
        onAddToCart(selectedVariant.id);
      }
      
      alert('Added to cart!');
      
    } catch (error: unknown) {
      console.error('Error adding to cart:', error);
      alert(error instanceof Error ? error.message : 'Failed to add to cart');
    }
  };

  /**
   * Request stock notification
   */
  const handleNotifyMe = async () => {
    if (!selectedVariant) return;

    const email = prompt('Enter your email to be notified when this item is back in stock:');
    if (!email) return;

    try {
      setNotifying(true);
      
      const response = await fetch(`${API_URL}/api/stock/notify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          email: email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to request notification');
      }

      alert('You will be notified when this item is back in stock!');
      
    } catch (error: unknown) {
      console.error('Error requesting notification:', error);
      alert(error instanceof Error ? error.message : 'Failed to request notification');
    } finally {
      setNotifying(false);
    }
  };

  /**
   * Format price
   */
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString('en-IN')}`;
  };

  if (!selectedVariant) {
    return null;
  }

  const isOutOfStock = selectedVariant.quantity === 0;
  const isLowStock = selectedVariant.quantity > 0 && selectedVariant.quantity <= 2;

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow group">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={resolveImageUrl(selectedVariant.image_url)}
          alt={`${product.name} - ${selectedVariant.color_name}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={handleImageError}
        />
        
        {/* Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
            Out of Stock
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
            <AlertCircle size={12} />
            Only {selectedVariant.quantity} left
          </div>
        )}

        {/* Color Indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          <div
            className="w-4 h-4 rounded-full border border-gray-300"
            style={{ backgroundColor: selectedVariant.hex_code }}
          />
          <span className="text-xs font-medium text-gray-700">{selectedVariant.color_name}</span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className="font-serif text-lg font-medium text-gray-900 mb-1 line-clamp-2">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(selectedVariant.price)}
          </span>
          {selectedVariant.is_negotiable && (
            <span className="text-xs text-gray-500 font-medium">(Negotiable)</span>
          )}
        </div>

        {/* Color Variants */}
        {product.product_variants && product.product_variants.length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Available Colors:</p>
            <div className="flex flex-wrap gap-2">
              {product.product_variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedVariant.id === variant.id
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: variant.hex_code }}
                  title={variant.color_name}
                  aria-label={`Select ${variant.color_name}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stock Quantity Display */}
        <div className="mb-4">
          {isOutOfStock ? (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertCircle size={16} />
              <span>Currently Unavailable</span>
            </div>
          ) : isLowStock ? (
            <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
              <AlertCircle size={16} />
              <span>Only {selectedVariant.quantity} left - Order soon!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span>✓ In Stock</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isOutOfStock ? (
            <button
              onClick={handleNotifyMe}
              disabled={notifying}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bell size={18} />
              Notify Me
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

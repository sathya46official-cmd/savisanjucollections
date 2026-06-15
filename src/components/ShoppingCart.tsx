"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Cart item interface
interface CartItem {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
  added_at: string;
  // Joined data
  product_name: string;
  product_image: string;
  color_name: string;
  price: number;
  stock: number;
}

// Cart interface
interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  total: number;
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  /**
   * Fetch cart from backend
   */
  const fetchCart = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}/api/cart`, {
        credentials: 'include', // Include cookies for JWT auth
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Not authenticated - redirect to login
        router.push('/auth?redirect=/shop');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      setCart(data);
      
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update cart item quantity
   */
  const updateQuantity = async (variantId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      setUpdating(variantId);
      
      const response = await fetch(`${API_URL}/api/cart/update`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variant_id: variantId,
          quantity: newQuantity
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update quantity');
      }

      // Update local state
      setCart(prev => {
        if (!prev) return null;
        
        const updatedItems = prev.items.map(item =>
          item.variant_id === variantId ? { ...item, quantity: newQuantity } : item
        );
        
        const newTotal = updatedItems.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        
        return {
          ...prev,
          items: updatedItems,
          total: newTotal
        };
      });
      
    } catch (error: unknown) {
      console.error('Error updating quantity:', error);
      alert(error instanceof Error ? error.message : 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Remove item from cart
   */
  const removeItem = async (variantId: string) => {
    try {
      setUpdating(variantId);
      
      const response = await fetch(`${API_URL}/api/cart/remove`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ variant_id: variantId })
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      // Update local state
      setCart(prev => {
        if (!prev) return null;
        
        const updatedItems = prev.items.filter(item => item.variant_id !== variantId);
        
        const newTotal = updatedItems.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        
        return {
          ...prev,
          items: updatedItems,
          total: newTotal
        };
      });
      
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  /**
   * Proceed to checkout
   */
  const proceedToCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  /**
   * Fetch cart when opened
   */
  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen]);

  /**
   * Format price
   */
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString('en-IN')}`;
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Cart Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-[#F4F2EC] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag size={24} className="text-gray-700" />
            <div>
              <h2 className="text-xl font-serif text-gray-900">Shopping Cart</h2>
              <p className="text-sm text-gray-500">
                {cart?.items.length || 0} item{cart?.items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close cart"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
              <ShoppingBag size={64} className="opacity-20" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-center">Add some beautiful sarees to get started!</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 transition-all hover:shadow-md"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-20 h-20 object-cover rounded-md border border-gray-200"
                        loading="lazy"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {item.product_name}
                          </h3>
                          <p className="text-sm text-gray-500">{item.color_name}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.variant_id)}
                          disabled={updating === item.variant_id}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Price */}
                      <p className="text-lg font-semibold text-gray-900 mb-3">
                        {formatPrice(item.price * item.quantity)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updating === item.variant_id}
                            className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock || updating === item.variant_id}
                            className="px-3 py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Stock Info */}
                        {item.stock <= 5 && (
                          <span className="text-xs text-orange-600 font-medium">
                            Only {item.stock} left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="bg-white border-t border-gray-200 p-6 space-y-4">
            {/* Total */}
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium text-gray-700">Total</span>
              <span className="font-bold text-gray-900 text-xl">
                {formatPrice(cart.total)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={proceedToCheckout}
              className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group"
            >
              Proceed to Checkout
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Continue Shopping */}
            <button
              onClick={onClose}
              className="w-full text-gray-600 py-2 text-sm hover:text-gray-900 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Loader2, X, Share2, Star } from "lucide-react";
import Link from "next/link";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Order status type
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Order interface
interface Order {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name: string;
  product_image: string;
  color_name: string;
  price: number;
}

// Status badge colors
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

// Status labels
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  /**
   * Fetch order history
   */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API_URL}/api/orders/history`, {
          credentials: 'include'
        });

        if (response.status === 401) {
          // Not authenticated - redirect to login
          router.push('/auth?redirect=/orders');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        setOrders(data);

      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  /**
   * Cancel order
   */
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setCancelling(orderId);

      const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: 'cancelled' as OrderStatus }
          : order
      ));

      alert('Order cancelled successfully');

    } catch (error: unknown) {
      console.error('Error cancelling order:', error);
      alert(error instanceof Error ? error.message : 'Failed to cancel order');
    } finally {
      setCancelling(null);
    }
  };

  /**
   * Share order (social sharing)
   */
  const handleShare = async (order: Order) => {
    const text = `I just ordered a beautiful ${order.product_name} from SaviSanju Collections! 🎉`;
    const url = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SaviSanju Collections',
          text: text,
          url: url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('Link copied to clipboard!');
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * Format price
   */
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString('en-IN')}`;
  };

  /**
   * Get status progress
   */
  const getStatusProgress = (status: OrderStatus): number => {
    const progressMap: Record<OrderStatus, number> = {
      pending: 20,
      confirmed: 40,
      processing: 60,
      shipped: 80,
      delivered: 100,
      cancelled: 0
    };
    return progressMap[status];
  };

  /**
   * Can cancel order
   */
  const canCancelOrder = (status: OrderStatus): boolean => {
    return ['pending', 'confirmed', 'processing'].includes(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2EC] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-serif text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const progress = getStatusProgress(order.status);
              const isCancellable = canCancelOrder(order.status);
              const isDelivered = order.status === 'delivered';

              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Order ID</p>
                      <p className="font-mono font-semibold text-gray-900">{order.order_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-6">
                    <div className="flex gap-4 mb-6">
                      {/* Product Image */}
                      <img
                        src={order.product_image}
                        alt={order.product_name}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />

                      {/* Product Details */}
                      <div className="flex-1">
                        <h3 className="font-serif text-lg text-gray-900 mb-1">{order.product_name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{order.color_name}</p>
                        <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                        <p className="text-lg font-semibold text-gray-900 mt-2">
                          {formatPrice(order.price * order.quantity)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {order.status !== 'cancelled' && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Order Placed</span>
                          <span>Delivered</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {isCancellable && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancelling === order.id}
                          className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelling === order.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X size={16} />
                              Cancel Order
                            </>
                          )}
                        </button>
                      )}

                      {isDelivered && (
                        <>
                          <button
                            onClick={() => handleShare(order)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Share2 size={16} />
                            Share
                          </button>
                          {process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_ID && 
                           process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_ID !== 'YOUR_GOOGLE_BUSINESS_ID' && (
                            <a
                              href={`https://g.page/r/${process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_ID}/review`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
                            >
                              <Star size={16} />
                              Rate on Google
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

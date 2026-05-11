"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Package, Bell, BellOff, MessageCircle, Check, X } from "lucide-react";
import { requestNotificationPermission, onMessageListener, showNotification, areNotificationsEnabled } from "@/lib/notifications/fcm";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Order status type
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Order interface
interface Order {
  id: string;
  order_id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  admin_notes?: string;
  contacted_at?: string;
  confirmed_price?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  product_name?: string;
  product_image?: string;
  color_name?: string;
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

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  
  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch orders from backend
   */
  const fetchOrders = useCallback(async (since?: string) => {
    try {
      setLoading(true);
      
      // Build URL with optional since parameter for polling
      const url = since 
        ? `${API_URL}/api/admin/orders?since=${encodeURIComponent(since)}`
        : `${API_URL}/api/admin/orders`;
      
      const response = await fetch(url, {
        credentials: 'include', // Include cookies for JWT auth
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (since && data.length > 0) {
        // New orders detected!
        setNewOrderCount(prev => prev + data.length);
        
        // Show browser notification
        if (notificationsEnabled) {
          showNotification(
            `🔔 ${data.length} New Order${data.length > 1 ? 's' : ''}`,
            {
              body: `Order ${data[0].order_id} and ${data.length - 1} more`,
              tag: 'new-orders',
              requireInteraction: true
            }
          );
        }
        
        // Play sound alert
        if (audioRef.current) {
          audioRef.current.play().catch(err => console.error('Failed to play sound:', err));
        }
        
        // Prepend new orders to existing list
        setOrders(prev => [...data, ...prev]);
      } else if (!since) {
        // Initial fetch or manual refresh
        setOrders(data);
      }
      
      // Update last fetch time
      setLastFetchTime(new Date().toISOString());
      
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled]);

  /**
   * Update order status
   */
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  /**
   * Enable browser notifications
   */
  const enableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setNotificationsEnabled(true);
      console.log('Notifications enabled! FCM Token:', token);
      // TODO: Send token to backend to store for push notifications
    } else {
      alert('Failed to enable notifications. Please check your browser settings.');
    }
  };

  /**
   * Start polling for new orders
   */
  const startPolling = useCallback(() => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Poll every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (lastFetchTime) {
        fetchOrders(lastFetchTime);
      }
    }, 10000); // 10 seconds
  }, [lastFetchTime, fetchOrders]);

  /**
   * Stop polling
   */
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  /**
   * Initial fetch and setup
   */
  useEffect(() => {
    // Initial fetch
    fetchOrders();
    
    // Check if notifications are already enabled
    setNotificationsEnabled(areNotificationsEnabled());
    
    // Setup audio element
    audioRef.current = new Audio('/notification.mp3');
    
    // Listen for foreground messages
    const unsubscribe = onMessageListener((payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification
      showNotification(
        payload.notification?.title || 'New Order',
        {
          body: payload.notification?.body,
          data: payload.data
        }
      );
      
      // Play sound
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.error('Failed to play sound:', err));
      }
      
      // Refresh orders
      fetchOrders();
    });
    
    // Cleanup
    return () => {
      stopPolling();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /**
   * Start/stop polling based on notifications
   */
  useEffect(() => {
    if (notificationsEnabled && lastFetchTime) {
      startPolling();
    } else {
      stopPolling();
    }
    
    return () => stopPolling();
  }, [notificationsEnabled, lastFetchTime, startPolling]);

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Get WhatsApp link
   */
  const getWhatsAppLink = (phone: string) => {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    // Add country code if not present (assuming India +91)
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    return `https://wa.me/${phoneWithCode}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-purple-50 to-blue-50">
            <div>
              <h1 className="text-3xl font-serif text-gray-900 mb-1">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Manage orders and customer requests</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Status */}
              {notificationsEnabled ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <Bell size={16} className="animate-pulse" />
                  <span className="font-medium">Notifications Active</span>
                </div>
              ) : (
                <button
                  onClick={enableNotifications}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 hover:bg-yellow-100 transition-colors"
                >
                  <BellOff size={16} />
                  <span className="font-medium">Enable Notifications</span>
                </button>
              )}
              
              {/* Refresh Button */}
              <button 
                onClick={() => fetchOrders()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
          
          {/* New Orders Alert */}
          {newOrderCount > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <Bell size={16} />
                <span className="font-medium">{newOrderCount} new order{newOrderCount > 1 ? 's' : ''} received!</span>
              </div>
              <button
                onClick={() => setNewOrderCount(0)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && orders.length === 0 ? (
            <div className="p-12 flex justify-center text-gray-400">
              <RefreshCw size={24} className="animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4">
              <Package size={48} className="opacity-20" />
              <p className="text-lg">No orders received yet.</p>
              <p className="text-sm">Orders will appear here when customers place them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 text-xs font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const validTransitions = VALID_TRANSITIONS[order.status] || [];
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-medium text-gray-900">
                            {order.order_id}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {order.product_image ? (
                              <img 
                                src={order.product_image} 
                                alt={order.product_name || 'Product'} 
                                className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-gray-400">
                                <Package size={20} />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{order.product_name || 'Unknown Product'}</div>
                              <div className="text-xs text-gray-500">{order.color_name || 'Default'}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{order.quantity}</span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium text-gray-900">{order.customer_phone}</div>
                            <a
                              href={getWhatsAppLink(order.customer_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              <MessageCircle size={12} />
                              WhatsApp
                            </a>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        
                        <td className="px-6 py-4">
                          {validTransitions.length > 0 ? (
                            <div className="flex items-center justify-center gap-2">
                              {validTransitions.map(status => (
                                <button
                                  key={status}
                                  onClick={() => updateOrderStatus(order.id, status)}
                                  className={`p-2 rounded-lg border transition-colors ${
                                    status === 'cancelled'
                                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                                      : 'border-green-200 text-green-600 hover:bg-green-50'
                                  }`}
                                  title={`Mark as ${status}`}
                                >
                                  {status === 'cancelled' ? <X size={16} /> : <Check size={16} />}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-xs text-gray-400">
                              {order.status === 'delivered' ? 'Complete' : 'Final'}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

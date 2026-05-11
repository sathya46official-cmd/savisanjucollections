"use client";

import { useState, useEffect } from "react";
import { Search, Phone, Mail, MessageCircle, Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import Image from "next/image";

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  order_id: string;
  user_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  confirmed_price?: number;
  status: OrderStatus;
  admin_notes?: string;
  contacted_at?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  variant_color: string;
  variant_image_url: string;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  confirmed: { label: "Confirmed", icon: CheckCircle, color: "text-blue-600 bg-blue-50" },
  processing: { label: "Processing", icon: Package, color: "text-purple-600 bg-purple-50" },
  shipped: { label: "Shipped", icon: Truck, color: "text-indigo-600 bg-indigo-50" },
  delivered: { label: "Delivered", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-600 bg-red-50" }
};

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await apiClient.getAdminOrders(statusFilter === 'all' ? undefined : statusFilter);
    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await apiClient.updateOrderStatus(orderId, newStatus);
    
    if (!error) {
      fetchOrders();
      if (selectedOrder?.order_id === orderId) {
        const { data } = await apiClient.getOrder(orderId);
        if (data) setSelectedOrder(data);
      }
    } else {
      alert(error?.message || "Failed to update status");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;

    const { error } = await apiClient.updateOrderStatus(selectedOrder.order_id, selectedOrder.status, adminNotes);
    
    if (!error) {
      alert("Notes saved successfully");
      fetchOrders();
    } else {
      alert(error?.message || "Failed to save notes");
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500 mt-1">View and manage customer orders</p>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              statusFilter === status
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : statusConfig[status].label} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Order ID or Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map(order => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                    setSelectedOrder(order);
                    setAdminNotes(order.admin_notes || "");
                  }}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.order_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{order.customer_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.product_name} - {order.variant_color}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}>
                        <StatusIcon size={14} />
                        {statusConfig[order.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ₹{((order.confirmed_price || order.price) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setAdminNotes(order.admin_notes || "");
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedOrder.order_id}</h2>
                <p className="text-gray-500 text-sm">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Customer Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><span className="font-medium">Name:</span> {selectedOrder.customer_name}</p>
                <p><span className="font-medium">Email:</span> {selectedOrder.customer_email}</p>
                <p><span className="font-medium">Phone:</span> {selectedOrder.phone}</p>
                <div className="flex gap-2 mt-3">
                  <a href={`tel:${selectedOrder.phone}`} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    <Phone size={16} />
                    Call
                  </a>
                  <a href={`mailto:${selectedOrder.customer_email}`} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <Mail size={16} />
                    Email
                  </a>
                  <a href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Delivery Address</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p>{selectedOrder.address_line1}</p>
                {selectedOrder.address_line2 && <p>{selectedOrder.address_line2}</p>}
                <p>{selectedOrder.city}, {selectedOrder.state} {selectedOrder.postal_code}</p>
                <p>{selectedOrder.country}</p>
              </div>
            </div>

            {/* Product Details */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Product Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 flex gap-4">
                {selectedOrder.variant_image_url && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-white">
                    <Image
                      src={JSON.parse(selectedOrder.variant_image_url)[0] || "/placeholder.png"}
                      alt={selectedOrder.product_name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{selectedOrder.product_name}</p>
                  <p className="text-sm text-gray-600">Color: {selectedOrder.variant_color}</p>
                  <p className="text-sm text-gray-600">Quantity: {selectedOrder.quantity}</p>
                  <p className="text-sm text-gray-600">
                    Price: ₹{(selectedOrder.price / 100).toFixed(2)}
                  </p>
                  {selectedOrder.confirmed_price && (
                    <p className="text-sm font-medium text-green-600">
                      Confirmed Price: ₹{(selectedOrder.confirmed_price / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Order Status</h3>
              <select
                value={selectedOrder.status}
                onChange={(e) => handleStatusUpdate(selectedOrder.order_id, e.target.value as OrderStatus)}
                disabled={statusTransitions[selectedOrder.status].length === 0}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={selectedOrder.status}>{statusConfig[selectedOrder.status].label}</option>
                {statusTransitions[selectedOrder.status].map(status => (
                  <option key={status} value={status}>{statusConfig[status].label}</option>
                ))}
              </select>
            </div>

            {/* Admin Notes */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Admin Notes</h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Add notes about this order..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">{adminNotes.length}/1000 characters</span>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

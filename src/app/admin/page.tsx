"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { RefreshCw, Package } from "lucide-react";

export default function AdminDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        setLoading(true);
        // We use a join to get variant and product details
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                product_variants (
                    color_name,
                    image_url,
                    products (
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (data) setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h1 className="text-2xl font-serif text-gray-900">Recent Orders</h1>
                <button 
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="p-12 flex justify-center text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Package size={48} className="opacity-20" />
                    <p>No orders received yet.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Product Variant</th>
                                <th className="px-6 py-4">Customer Details</th>
                                <th className="px-6 py-4 border-l border-gray-200 max-w-xs">Address</th>
                                <th className="px-6 py-4 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order) => {
                                const variant = order.product_variants || {};
                                const product = variant.products || {};
                                const date = new Date(order.created_at).toLocaleString();

                                return (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono font-medium text-gray-900">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {variant.image_url ? (
                                                    <img src={`/${variant.image_url}`} alt="Product" className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-gray-400">?</div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">{product.name || 'Unknown Product'}</div>
                                                    <div className="text-xs text-gray-500">{variant.color_name || 'Unknown Color'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-gray-900 font-medium">{order.customer_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs leading-relaxed border-l border-gray-100 max-w-xs truncate group-hover:whitespace-normal group-hover:break-words">
                                            {order.customer_address}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 text-xs">
                                            {date}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

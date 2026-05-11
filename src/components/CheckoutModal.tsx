"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useRouter } from "next/navigation";

interface Variant {
    id: string;
    product_id: string;
    color_name: string;
    hex_code: string;
    image_url: string;
    stock_status: string;
}

interface Product {
    id: string;
    name: string;
}

interface CheckoutModalProps {
    isOpen: boolean;
    product: Product | null;
    variant: Variant | null;
    onClose: () => void;
}

export default function CheckoutModal({ isOpen, product, variant, onClose }: CheckoutModalProps) {
    const router = useRouter();
    
    const [address, setAddress] = useState("");
    const [mobile, setMobile] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Check authentication when modal opens
        const checkAuth = async () => {
            try {
                // Call backend to verify auth token (httpOnly cookie)
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    // Not authenticated - close modal and redirect to login
                    onClose();
                    
                    // Save current page URL to redirect back after login
                    const currentUrl = window.location.pathname + window.location.search;
                    router.push(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                // On error, assume not authenticated
                onClose();
                const currentUrl = window.location.pathname + window.location.search;
                router.push(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
            }
        };

        checkAuth();
    }, [isOpen, router, onClose]);

    // Parse address into components for API
    const parseAddress = (fullAddress: string) => {
        const lines = fullAddress.trim().split('\n');
        const lastLine = lines[lines.length - 1] || '';
        
        // Try to extract postal code (6 digits)
        const postalMatch = lastLine.match(/\b\d{6}\b/);
        const postal_code = postalMatch ? postalMatch[0] : '';
        
        return {
            address_line1: lines[0] || fullAddress,
            address_line2: lines.length > 1 ? lines.slice(1, -1).join(', ') : '',
            city: 'City',
            state: 'State',
            postal_code: postal_code || '000000',
            country: 'India',
        };
    };

    if (!isOpen || !product || !variant) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const addressParts = parseAddress(address);
            
            const { data, error: apiError } = await apiClient.createOrder({
                variant_id: variant.id,
                quantity: 1,
                ...addressParts,
                phone: mobile,
            });

            setIsSubmitting(false);

            if (apiError || !data) {
                console.error("Error saving order:", apiError);
                setError(apiError?.message || "Failed to place order. Please try again.");
                return;
            }

            setOrderId((data as { order: { order_id: string } }).order.order_id);
        } catch (err) {
            setIsSubmitting(false);
            console.error("Error placing order:", err);
            setError("Failed to place order. Please try again.");
        }
    };

    const handleClose = () => {
        setTimeout(() => {
            setOrderId(null);
            setError(null);
        }, 300);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#F4F2EC] w-full max-w-lg rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/5 hover:bg-black/10 transition text-black"
                >
                    <X size={20} />
                </button>

                {orderId ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center h-full gap-6">
                        <CheckCircle size={64} className="text-green-600" />
                        <h2 className="text-3xl font-serif text-[#1A1A1A]">Thank You!</h2>
                        <p className="text-gray-600">
                            Your order for the <strong className="text-black">{product.name} ({variant.color_name})</strong> has been successfully placed.
                        </p>
                        <div className="bg-white p-4 rounded-lg w-full border border-[#E0DCD0]">
                            <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                            <p className="text-2xl font-mono font-bold tracking-widest text-black">{orderId}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Our customer agent will contact you shortly to confirm delivery details and arrange payment at your doorstep. We've saved your address for next time!
                        </p>
                        <button 
                            onClick={handleClose}
                            className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-black/80 transition mt-4"
                        >
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-[#E0DCD0] flex gap-4 items-center bg-white">
                            <img 
                                src={variant.image_url} 
                                alt={product.name} 
                                className="w-16 h-16 object-cover rounded-md border border-gray-200"
                                loading="lazy"
                            />
                            <div>
                                <h3 className="text-xl font-serif text-black">{product.name}</h3>
                                <p className="text-sm text-gray-500">{variant.color_name}</p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <h2 className="text-2xl font-serif mb-6 text-[#1A1A1A]">Delivery Details</h2>
                            
                            {error && (
                                <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="mobile" className="text-sm font-medium text-gray-700 flex justify-between">
                                        <span>Mobile Number *</span>
                                        {mobile && <span className="text-green-600 text-xs font-normal">Auto-filled</span>}
                                    </label>
                                    <input 
                                        type="tel" 
                                        id="mobile"
                                        required
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                        value={mobile}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) setMobile(val);
                                        }}
                                        className="border border-[#E0DCD0] rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/20 bg-white text-black"
                                        placeholder="Enter 10 digit mobile number"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label htmlFor="address" className="text-sm font-medium text-gray-700 flex justify-between">
                                        <span>Full Address *</span>
                                        {address && <span className="text-green-600 text-xs font-normal">Auto-filled</span>}
                                    </label>
                                    <textarea 
                                        id="address"
                                        required
                                        rows={4}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="border border-[#E0DCD0] rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/20 bg-white resize-none text-black"
                                        placeholder="Enter your complete delivery address with PIN code..."
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-black text-white py-4 rounded-md font-medium hover:bg-black/80 transition mt-4 disabled:opacity-70 flex justify-center items-center"
                                >
                                    {isSubmitting ? "Processing..." : "Confirm Delivery Order"}
                                </button>
                                <p className="text-xs text-center text-gray-500 mt-2">
                                    You don't need to pay online. Our agent will contact you.
                                </p>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

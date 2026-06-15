"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, MapPin, Phone, Check, Loader2 } from "lucide-react";
import Link from "next/link";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Cart item interface
interface CartItem {
  id: string;
  variant_id: string;
  quantity: number;
  product_name: string;
  product_image: string;
  color_name: string;
  price: number;
}

// Address interface
interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [step, setStep] = useState<'address' | 'confirm' | 'success'>('address');
  const [orderId, setOrderId] = useState<string | null>(null);

  // Form state
  const [address, setAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const [phone, setPhone] = useState('');

  /**
   * Fetch cart and user profile
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch cart
        const cartResponse = await fetch(`${API_URL}/api/cart`, {
          credentials: 'include'
        });

        if (cartResponse.status === 401) {
          // Not authenticated - redirect to login
          router.push('/auth?redirect=/checkout');
          return;
        }

        if (!cartResponse.ok) {
          throw new Error('Failed to fetch cart');
        }

        const cartData = await cartResponse.json();
        setCartItems(cartData.items || []);
        setTotal(cartData.total || 0);

        if (cartData.items.length === 0) {
          // Empty cart - redirect to shop
          router.push('/shop');
          return;
        }

        // Fetch user profile for auto-fill
        const profileResponse = await fetch(`${API_URL}/api/auth/profile`, {
          credentials: 'include'
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          // Auto-fill address if available
          if (profileData.address_line1) {
            setAddress({
              line1: profileData.address_line1 || '',
              line2: profileData.address_line2 || '',
              city: profileData.city || '',
              state: profileData.state || '',
              postalCode: profileData.postal_code || '',
              country: profileData.country || 'India'
            });
          }
          
          // Auto-fill phone
          if (profileData.default_phone) {
            setPhone(profileData.default_phone);
          }
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load checkout. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  /**
   * Handle address form submission
   */
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!address.line1 || !address.city || !address.state || !address.postalCode || !phone) {
      alert('Please fill in all required fields');
      return;
    }

    // Move to confirm step
    setStep('confirm');
  };

  /**
   * Place order
   */
  const handlePlaceOrder = async () => {
    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/api/orders/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            variantId: item.variant_id,
            quantity: item.quantity
          })),
          address: address,
          phone: phone
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }

      const data = await response.json();
      setOrderId(data.orderId);
      setStep('success');

    } catch (error: unknown) {
      console.error('Error placing order:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Format price
   */
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-600" />
          </div>
          
          <h1 className="text-3xl font-serif text-gray-900 mb-4">Order Placed Successfully!</h1>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your Order ID</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{orderId}</p>
          </div>

          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">What happens next?</h2>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Our team will review your order</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>We&apos;ll contact you to confirm the price and delivery details</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Once confirmed, we&apos;ll process your order</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Your order will be delivered within <strong>5-6 business days</strong></span>
              </li>
            </ol>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            <strong>Need help?</strong><br />
            Contact us at <a href="mailto:support@savisanju.com" className="text-blue-600 hover:underline">support@savisanju.com</a>
          </p>

          <p className="text-sm text-gray-600 mb-6">
            <strong>Prefer WhatsApp?</strong><br />
            <a 
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919876543210'}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-600 hover:underline font-medium"
            >
              Message us on WhatsApp
            </a>
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/orders"
              className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2EC] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Shop
          </Link>
          <h1 className="text-3xl font-serif text-gray-900">Checkout</h1>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'address' ? 'text-gray-900' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-gray-900 text-white' : 'bg-green-600 text-white'}`}>
                {step === 'address' ? '1' : <Check size={16} />}
              </div>
              <span className="font-medium">Address</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${
              step === 'confirm' ? 'text-gray-900' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'confirm' ? 'bg-gray-900 text-white' : 'bg-gray-300 text-white'
              }`}>
                {'2'}
              </div>
              <span className="font-medium">Confirm</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'address' && (
              <form onSubmit={handleAddressSubmit} className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-serif text-gray-900 mb-6 flex items-center gap-2">
                  <MapPin size={24} />
                  Delivery Address
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="House/Flat No., Building Name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Street, Area, Landmark"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={address.postalCode}
                        onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        pattern="[0-9]{6}"
                        placeholder="123456"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={address.country}
                        onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Phone size={16} />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      pattern="[0-9]{10}"
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Continue to Review
                </button>
              </form>
            )}

            {step === 'confirm' && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-serif text-gray-900 mb-6">Review Your Order</h2>

                {/* Address Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin size={18} />
                    Delivery Address
                  </h3>
                  <p className="text-sm text-gray-700">
                    {address.line1}<br />
                    {address.line2 && <>{address.line2}<br /></>}
                    {address.city}, {address.state} {address.postalCode}<br />
                    {address.country}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 flex items-center gap-2">
                    <Phone size={14} />
                    {phone}
                  </p>
                  <button
                    onClick={() => setStep('address')}
                    className="text-sm text-blue-600 hover:underline mt-2"
                  >
                    Edit Address
                  </button>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">{item.color_name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4">
              <h2 className="text-lg font-serif text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>✓ Free delivery</p>
                <p>✓ Pay after satisfaction (COD/UPI)</p>
                <p>✓ Price confirmation by our team</p>
                <p>✓ Estimated delivery: 5-6 business days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

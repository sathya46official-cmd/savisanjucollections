"use client";

import { Mail, MessageCircle, MapPin } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  const handleWhatsAppClick = () => {
    // Customer-initiated WhatsApp contact (privacy-protected)
    // Opens WhatsApp without exposing phone number publicly
    window.open('https://wa.me/message/YOUR_WHATSAPP_BUSINESS_ID', '_blank');
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-serif mb-4">SaviSanju</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Luxury sarees curated with elegance and tradition. Experience personalized service and exceptional quality.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/shop" className="text-gray-400 hover:text-white transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-gray-400 hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/auth" className="text-gray-400 hover:text-white transition-colors">
                  Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Estimated Delivery: 5-6 business days</li>
              <li>Pay After Satisfaction</li>
              <li>COD & UPI Available</li>
              <li>Price Negotiation Welcome</li>
            </ul>
          </div>

          {/* Contact (Privacy-Protected) */}
          <div>
            <h4 className="font-semibold mb-4">Get In Touch</h4>
            <div className="space-y-3">
              {/* Email Contact */}
              <a 
                href="mailto:support@savisanju.com"
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <Mail size={16} />
                </div>
                <span>support@savisanju.com</span>
              </a>

              {/* WhatsApp (Customer-Initiated) */}
              <button
                onClick={handleWhatsAppClick}
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group w-full text-left"
              >
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                  <MessageCircle size={16} />
                </div>
                <span>Message us on WhatsApp</span>
              </button>

              {/* Location */}
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <span>Serving customers across India</span>
              </div>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-gray-500 mt-4 leading-relaxed">
              Your privacy is protected. Contact information is never shared with third parties.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} SaviSanju Collections. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

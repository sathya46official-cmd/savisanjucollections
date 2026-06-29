"use client";

import { useState } from "react";
import { Menu, X, Home, ShoppingBag, Package, User, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface MobileNavProps {
  isAuthenticated?: boolean;
  userName?: string;
}

export default function MobileNav({ isAuthenticated = false, userName }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setIsOpen(false);
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Close menu
   */
  const closeMenu = () => {
    setIsOpen(false);
  };

  /**
   * Check if link is active
   */
  const isActive = (path: string) => {
    return pathname === path;
  };

  // Navigation links
  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    ...(isAuthenticated ? [
      { href: '/orders', label: 'My Orders', icon: Package },
      { href: '/auth', label: 'Account', icon: User }
    ] : [])
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-40 p-3 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors md:hidden"
        style={{ minWidth: '44px', minHeight: '44px' }}
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-900" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={closeMenu}
        />
      )}

      {/* Slide-in Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F4F2EC] to-[#EAE6D9] p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif text-gray-900">Menu</h2>
            <button
              onClick={closeMenu}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              style={{ minWidth: '44px', minHeight: '44px' }}
              aria-label="Close menu"
            >
              <X size={24} className="text-gray-900" />
            </button>
          </div>

          {/* User Info */}
          {isAuthenticated && userName && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-[#9A7B4F] to-[#7A2E2E] rounded-full flex items-center justify-center text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Icon size={20} />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}

          {/* Auth Links */}
          {!isAuthenticated && (
            <Link
              href="/auth"
              onClick={closeMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              style={{ minHeight: '44px' }}
            >
              <User size={20} />
              <span className="font-medium">Sign In</span>
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
              style={{ minHeight: '44px' }}
            >
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="text-center text-sm text-gray-500">
              <p className="mb-1">SaviSanju Collections</p>
              <p className="text-xs">Luxury Sarees</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

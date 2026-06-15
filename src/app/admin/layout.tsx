"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Lock } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status by calling a protected endpoint
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data, error } = await apiClient.getAdminOrders();
      
      if (!error && data) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const { data, error } = await apiClient.adminLogin(email, password);

      if (!error && data) {
        setIsAuthenticated(true);
        setPassword("");
        router.refresh(); // Refresh to load admin content
      } else {
        setError(error?.message || "Invalid credentials");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      setIsAuthenticated(false);
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) return null; // Prevent hydration flash

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                <Lock className="text-gray-400" size={24} />
            </div>
          </div>
          <h1 className="text-2xl font-serif text-center mb-2 text-gray-900">Admin Access</h1>
          <p className="text-center text-gray-500 text-sm mb-8">Enter your credentials to manage inventory and view orders.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
                <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email" 
                    className="w-full border border-gray-200 px-4 py-3 rounded-md outline-none focus:ring-2 focus:ring-black bg-gray-50/50"
                    autoComplete="email"
                />
            </div>
            <div>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" 
                    className="w-full border border-gray-200 px-4 py-3 rounded-md outline-none focus:ring-2 focus:ring-black bg-gray-50/50"
                    autoComplete="current-password"
                />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition">
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-serif font-bold tracking-tight text-black">
                SaviSanju<span className="text-gray-400 font-medium tracking-normal">Admin</span>
            </h1>
        </div>
        
        <nav className="p-4 flex flex-col gap-2 flex-1">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                <ShoppingBag size={18} />
                Recent Orders
            </Link>
            <Link href="/admin/inventory" className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-gray-50 text-gray-700 transition-colors">
                <Package size={18} />
                Manage Inventory
            </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
            <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
                Lock Session
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 z-10 sticky top-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={14} className="text-green-600" />
                <span className="text-green-600 font-medium">Secure Session Active</span>
            </div>
        </header>
        <div className="p-8 pb-24">
            {children}
        </div>
      </main>
    </div>
  );
}

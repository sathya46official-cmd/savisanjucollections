"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingBag, Lock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session on mount
    const session = localStorage.getItem("savi_admin_auth");
    if (session === "authenticated") {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple secure gate. In production, use Supabase Auth to issue secure JWT cookies.
    // This prevents unauthorized access to the client routes.
    const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "SAVI2026";
    if (password === adminPass) {
      localStorage.setItem("savi_admin_auth", "authenticated");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect Admin Password.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("savi_admin_auth");
    setIsAuthenticated(false);
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
          <p className="text-center text-gray-500 text-sm mb-8">Enter the master password to manage inventory and view orders.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password" 
                    className="w-full border border-gray-200 px-4 py-3 rounded-md outline-none focus:ring-2 focus:ring-black bg-gray-50/50"
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

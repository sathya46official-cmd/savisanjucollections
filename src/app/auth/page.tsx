"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Check if user came from clicking 'Shop Now'
    const returnTo = searchParams.get('returnTo');
    const autoCheckoutVariant = searchParams.get('variantId');

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sessionUser, setSessionUser] = useState<any>(null);

    // If user is already logged in, send them back OR show their profile
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                if (returnTo) {
                    // They came from a checkout flow, auto-redirect back to finish checkout
                    const dest = autoCheckoutVariant ? `${returnTo}?checkout=${autoCheckoutVariant}` : returnTo;
                    router.push(dest);
                } else {
                    // They clicked 'Account' in the header while already logged in
                    setSessionUser(session.user);
                }
            }
        };
        checkUser();
    }, [returnTo, autoCheckoutVariant, router]);

    const handleRedirect = () => {
        if (returnTo) {
            const dest = autoCheckoutVariant ? `${returnTo}?checkout=${autoCheckoutVariant}` : returnTo;
            router.push(dest);
        } else {
            router.push('/');
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
                handleRedirect();
            } else {
                const { error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (authError) throw authError;
                
                alert("Registration successful! You are now securely logged in.");
                handleRedirect();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setSessionUser(null);
    };

    // --- Authenticated View ---
    if (sessionUser) {
        return (
            <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-5xl font-serif text-[#1A1A1A]">SaviSanju<span className="font-light">Collections</span></h1>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 text-center">
                    <h2 className="text-2xl font-serif mb-2 text-gray-900 border-b pb-4">Your Account</h2>
                    <p className="text-gray-500 mb-8 mt-4 tracking-widest text-sm">{sessionUser.email}</p>
                    
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full bg-black text-white py-3.5 mb-3 rounded-md font-medium tracking-widest text-sm hover:bg-gray-800 transition uppercase"
                    >
                        Continue Shopping
                    </button>
                    
                    <button 
                        onClick={handleSignOut}
                        className="w-full bg-transparent border border-black text-black py-3.5 rounded-md font-medium tracking-widest text-sm hover:bg-gray-50 transition uppercase"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // --- Unauthenticated View ---
    return (
        <div className="min-h-screen bg-[#F4F2EC] flex flex-col justify-center items-center p-4">
            
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl font-serif text-[#1A1A1A]">SaviSanju<span className="font-light">Collections</span></h1>
                <p className="text-gray-500 mt-2 font-light tracking-wide">
                    {returnTo ? "Log in or register to secure your saree." : "Welcome back to elegance."}
                </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <h2 className="text-2xl font-serif text-center mb-6 text-gray-900 border-b pb-4">
                    {isLogin ? "Secure Login" : "Create Account"}
                </h2>
                
                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-200 px-4 py-3 rounded-md outline-none focus:ring-2 focus:ring-black bg-gray-50/50 text-black placeholder-gray-400"
                            placeholder="you@email.com"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input 
                            type="password" 
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-200 px-4 py-3 rounded-md outline-none focus:ring-2 focus:ring-black bg-gray-50/50 text-black placeholder-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-black text-white py-3.5 mt-2 rounded-md font-medium hover:bg-gray-800 transition disabled:opacity-70"
                    >
                        {loading ? "Processing Securely..." : (isLogin ? "Sign In" : "Register Securely")}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-500 hover:text-black transition"
                    >
                        {isLogin ? "New to SaviSanju? Create an account" : "Already registered? Sign in securely"}
                    </button>
                </div>
            </div>
            
            <button 
                onClick={() => router.push('/')}
                className="mt-8 text-sm text-gray-400 hover:text-black transition underline underline-offset-4"
            >
                Return to Collection
            </button>
        </div>
    );
}

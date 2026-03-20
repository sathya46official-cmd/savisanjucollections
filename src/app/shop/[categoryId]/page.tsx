import { Suspense } from "react";
import ShopGridClient from "@/components/ShopGridClient";
import { supabase } from "@/lib/supabase/client";
import { Metadata } from "next";

export async function generateMetadata(
    { params }: { params: Promise<{ categoryId: string }> }
): Promise<Metadata> {
    const { categoryId } = await params;
    const { data } = await supabase.from('products').select('name').eq('id', categoryId).single();
    
    return {
        title: `${data?.name || 'Shop'} | SaviSanjuCollections`,
        description: `Explore our premium collection of elegant ${data?.name || ''} sarees.`,
    };
}

export default async function ShopCategoryPage(
    { params }: { params: Promise<{ categoryId: string }> }
) {
    const { categoryId } = await params;
    // We pre-fetch the category name on the server
    const { data: category } = await supabase.from('products').select('*').eq('id', categoryId).single();

    return (
        <main className="min-h-screen bg-[#FAF9F6]">
            {/* Elegant Header */}
            <header className="w-full py-8 border-b border-[#EAE6D9] bg-white sticky top-0 z-40 flex items-center justify-between px-8 md:px-16">
                <a href="/" className="text-2xl font-serif tracking-widest text-[#1A1A1A]">
                    SaviSanju<span className="text-[#8C8776]">Collections</span>
                </a>
                <nav className="hidden md:flex gap-8 text-sm uppercase tracking-widest text-[#5C584E]">
                    <a href="/" className="hover:text-[#1A1A1A] transition-colors">Home</a>
                    <a href="/shop" className="text-[#1A1A1A]">Sarees</a>
                    <a href="/auth" className="hover:text-[#1A1A1A] transition-colors">Account</a>
                </nav>
            </header>

            {/* Luxurious Hero Banner for Category */}
            <div className="relative w-full h-[40vh] md:h-[50vh] bg-[#EAE6D9] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#D7D1C4]/50 to-[#EAE6D9]/50 mix-blend-multiply" />
                <div className="z-10 text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-serif text-[#1A1A1A] tracking-wider mb-4">
                        {category?.name || 'Sarees'}
                    </h1>
                    <p className="text-[#5C584E] max-w-2xl mx-auto text-sm md:text-base leading-relaxed tracking-wide font-light">
                        {category?.description || 'Discover the timeless elegance of our elegant collections.'}
                    </p>
                </div>
            </div>

            {/* Main Shop Layout */}
            <Suspense fallback={<div className="h-screen flex items-center justify-center text-[#8C8776] tracking-widest">LOADING COLLECTION...</div>}>
                <ShopGridClient categoryId={categoryId} categoryName={category?.name || 'Collection'} />
            </Suspense>
        </main>
    );    
}

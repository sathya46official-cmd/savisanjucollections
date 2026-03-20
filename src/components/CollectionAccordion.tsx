"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function CollectionAccordion() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        const fetchCatalog = async () => {
            const { data } = await supabase
                .from('products')
                .select(`
                    *,
                    variants:product_variants (*)
                `)
                .order('created_at', { ascending: true });
            
            if (data) {
                // Filter out products with no variants so they don't break the UI
                const activeProducts = data.filter(p => p.variants && p.variants.length > 0);
                setProducts(activeProducts);
            }
        };
        fetchCatalog();
    }, []);

    const handleProductClick = (product: any) => {
        // Navigate to the Product Listing Page grid for this specific category
        router.push(`/shop/${product.id}`);
    };

    return (
        <section id="collections" className="relative w-full h-screen bg-[#F4F2EC] overflow-hidden flex flex-col justify-center z-10">
            {products.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-serif text-xl tracking-widest">
                    Loading Collection...
                </div>
            ) : (
                <div className="w-full h-full flex items-stretch">
                    {products.map((product) => {
                        const defaultVariant = product.variants[0];
                        return (
                            <div
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="group relative flex-1 transition-[flex] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] hover:flex-[3] cursor-pointer overflow-hidden border-r border-[#E0DCD0] last:border-none"
                            >
                                {/* Background Image with Default Filters */}
                                <div className="absolute inset-0 w-full h-full pointer-events-none bg-gray-200">
                                    {defaultVariant?.image_url && (
                                        <img
                                            src={defaultVariant.image_url}
                                            alt={product.name}
                                            loading="eager"
                                            className="absolute inset-0 w-full h-full object-cover object-center filter grayscale-[40%] opacity-50 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
                                        />
                                    )}
                                </div>

                                {/* Title Overlay */}
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-colors duration-700 ease-in-out z-10" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100 pointer-events-none">
                                    <h3 className="text-white text-3xl md:text-5xl font-serif tracking-[0.2em] uppercase drop-shadow-lg mb-4">
                                        {product.name}
                                    </h3>
                                    <button className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/30 text-white tracking-widest text-sm hover:bg-white hover:text-black transition-colors duration-300">
                                        VIEW COLLECTION
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}


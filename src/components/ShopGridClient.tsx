"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import CheckoutModal from "./CheckoutModal";
import { Heart, ShoppingBag } from "lucide-react";

export default function ShopGridClient({ categoryId, categoryName }: { categoryId: string, categoryName: string }) {
    const [variants, setVariants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter State
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
    
    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedVariantForCheckout, setSelectedVariantForCheckout] = useState<any | null>(null);

    useEffect(() => {
        const fetchVariants = async () => {
            // Fetch variants (sarees). If categoryId is 'all', fetch everything.
            let query = supabase
                .from('product_variants')
                .select('*, product:products(name)')
                .order('created_at', { ascending: true });
                
            if (categoryId !== 'all') {
                query = query.eq('product_id', categoryId);
            }
            
            const { data, error } = await query;
                
            if (data) setVariants(data);
            setLoading(false);
        };
        fetchVariants();
    }, [categoryId]);

    if (loading) return null;

    return (
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-16 flex flex-col md:flex-row gap-12">
            
            {/* Left Sidebar Filters */}
            <aside className="w-full md:w-64 flex-shrink-0 border-r border-[#EAE6D9] pr-8 hidden md:block">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#EAE6D9]">
                    <h3 className="text-sm font-serif tracking-[0.2em] text-[#A69E8C] uppercase">Filter By</h3>
                    {(selectedColors.length > 0 || selectedOccasion) && (
                        <button 
                            onClick={() => { setSelectedColors([]); setSelectedOccasion(null); }}
                            className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-700"
                        >Clear</button>
                    )}
                </div>
                
                <div className="mb-10">
                    <h4 className="text-sm tracking-widest text-[#1A1A1A] mb-4 uppercase">Color Palette</h4>
                    <div className="flex flex-wrap gap-3">
                        {Array.from(new Set(variants.map(v => v.hex_code))).map((hex: any, i) => (
                            <button 
                                key={i} 
                                onClick={() => setSelectedColors(prev => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex])}
                                className={`w-6 h-6 rounded-full shadow-sm cursor-pointer border-2 transition-transform hover:scale-110 ${selectedColors.includes(hex) ? 'border-[#1A1A1A] scale-110' : 'border-gray-200'}`}
                                style={{ backgroundColor: hex || '#fff' }}
                                title="Filter by Color"
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-10">
                    <h4 className="text-sm tracking-widest text-[#1A1A1A] mb-4 uppercase">Occasion</h4>
                    <ul className="space-y-3 text-sm text-[#5C584E] font-light">
                        {['Wedding Collection', 'Festive Wear', 'Bridal Trousseau', 'Evening Soiree'].map(occ => (
                            <li key={occ} onClick={() => setSelectedOccasion(selectedOccasion === occ ? null : occ)} className={`cursor-pointer transition ${selectedOccasion === occ ? 'text-black font-medium' : 'hover:text-black'}`}>
                                {occ}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            {/* Right Side: Product Grid */}
            <div className="flex-1">
                <div className="flex justify-between items-center mb-8 border-b border-[#EAE6D9] pb-4">
                    <h2 className="text-2xl font-serif text-[#1A1A1A] tracking-wider">
                        {categoryName} Collection
                    </h2>
                    <span className="text-sm text-[#8C8776] tracking-widest">
                        {variants.filter(v => (selectedColors.length === 0 || selectedColors.includes(v.hex_code))).length} Masterpieces
                    </span>
                </div>

                {variants.length === 0 ? (
                    <div className="text-center py-20 text-[#8C8776] tracking-widest uppercase">
                        No creations available in this collection yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {variants.filter(v => {
                            if (selectedColors.length > 0 && !selectedColors.includes(v.hex_code)) return false;
                            // Add specific occason logic here if DB supports it later, ignoring mock occasions for now
                            return true;
                        }).map((variant) => {
                            
                            const displayPrice = variant.price ? variant.price.toLocaleString('en-IN') : 'Price on Request';
                            const isNegotiable = variant.is_negotiable;

                            return (
                                <a 
                                    href={`/shop/${variant.product_id}/${variant.id}`} 
                                    key={variant.id} 
                                    className="group relative bg-white pb-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-sm cursor-pointer block"
                                >
                                    {/* Image Container */}
                                    <div className="w-full aspect-[3/4] overflow-hidden bg-[#F4F2EC] mb-6 relative">
                                        {variant.image_url ? (
                                            <>
                                                {/* Primary Image */}
                                                <img 
                                                    src={variant.image_url} 
                                                    alt={`${variant.color_name} Saree`}
                                                    className={`w-full h-full object-cover object-center absolute inset-0 transition-opacity duration-700 ${variant.additional_images && variant.additional_images.length > 0 ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                                                />
                                                {/* Secondary Image on Hover */}
                                                {variant.additional_images && variant.additional_images.length > 0 && (
                                                    <img 
                                                        src={variant.additional_images[0]} 
                                                        alt={`${variant.color_name} Alternate`}
                                                        className="w-full h-full object-cover object-center absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-hover:scale-105"
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#A69E8C]">Image Missing</div>
                                        )}
                                        
                                        {/* Minimal Quick Action Overlay */}
                                        <div className="absolute top-4 right-4 bg-white/50 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors">
                                            <Heart size={18} className="text-[#1A1A1A]" strokeWidth={1.5} />
                                        </div>

                                        {variant.stock_status === 'limited' && (
                                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md text-white text-[10px] tracking-widest uppercase px-3 py-1">
                                                Limited Edition
                                            </div>
                                        )}
                                    </div>

                                    {/* Typography & Details */}
                                    <div className="px-6 relative">
                                        <h3 className="text-[#1A1A1A] font-serif text-lg tracking-wide mb-1 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: variant.hex_code }} />
                                            {variant.color_name} {variant.product?.name || categoryName}
                                        </h3>
                                        
                                        <div className="flex justify-between items-end mb-6">
                                            <div className="text-sm text-[#5C584E] tracking-widest uppercase font-light">
                                                {variant.price ? `₹ ${displayPrice}` : displayPrice}
                                            </div>
                                            <div className="text-[10px] text-[#A69E8C] tracking-widest uppercase">
                                                {isNegotiable && variant.price ? 'Negotiable' : (variant.price ? 'Fixed' : '')}
                                            </div>
                                        </div>
                                        
                                        <div 
                                            className="w-full bg-[#1A1A1A] text-white tracking-widest uppercase text-xs py-4 flex items-center justify-center gap-2 hover:bg-[#333] transition-colors"
                                        >
                                            <ShoppingBag size={14} /> View Details
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

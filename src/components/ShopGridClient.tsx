"use client";

import { useState, useEffect, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import { resolveImageUrl, handleImageError } from "@/lib/images";
import CheckoutModal from "./CheckoutModal";
import ProductFilters from "./ProductFilters";
import ProductSort, { SortOption } from "./ProductSort";
import { Heart, ShoppingBag, Filter, X, Search } from "lucide-react";

interface ShopVariant {
    id: string;
    product_id: string;
    color: string;
    color_name: string;
    hex_code: string;
    image_url: string;
    stock_status: string;
    fabric: string;
    quantity?: number;
    price?: number;
    is_negotiable?: boolean;
    created_at?: string | number;
    product_name?: string;
    product?: { id: string; name: string };
}

export default function ShopGridClient({ categoryId, categoryName }: { categoryId: string, categoryName: string }) {
    const [variants, setVariants] = useState<ShopVariant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filter State
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [showOutOfStock, setShowOutOfStock] = useState(true);
    
    // Sort State
    const [sortBy, setSortBy] = useState<SortOption>('relevance');

    // Search State (client-side, in-memory filter only — never rendered as HTML)
    const [searchQuery, setSearchQuery] = useState("");

    // Mobile Filter State
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    
    // Checkout Modal State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedVariantForCheckout, setSelectedVariantForCheckout] = useState<ShopVariant | null>(null);

    useEffect(() => {
        const fetchVariants = async () => {
            setLoading(true);
            setError(null);
            try {
                if (categoryId === 'all') {
                    // Fetch all variants
                    const { data, error } = await apiClient.getAllVariants();
                    if (error) {
                        setError('Unable to load products. Please try again later.');
                        setVariants([]);
                        return;
                    }
                    if (data) {
                        // Transform data to match expected format
                const transformedData: ShopVariant[] = (data as ShopVariant[]).map((v) => ({
                            ...v,
                            price: v.price ? v.price / 100 : 0,
                            color_name: v.color,
                            hex_code: v.hex_code || '#000000',
                            stock_status: (v.quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
                            product: { id: v.product_id, name: v.product_name ?? '' },
                            fabric: v.fabric || 'Silk'
                        }));
                        setVariants(transformedData);
                        
                        // Set initial price range based on data
                        if (transformedData.length > 0) {
                            const prices = transformedData.map((v) => v.price || 0);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            setPriceRange([min, max]);
                        }
                    }
                } else {
                    // Fetch variants for specific product
                    const { data, error } = await apiClient.getProduct(categoryId);
                    if (error) {
                        setError('Unable to load products. Please try again later.');
                        setVariants([]);
                        return;
                    }
                    const product = data as { name?: string; variants?: ShopVariant[] } | null;
                    if (product && product.variants) {
                        // Transform data to match expected format
                        const transformedData: ShopVariant[] = product.variants.map((v) => ({
                            ...v,
                            price: v.price ? v.price / 100 : 0,
                            color_name: v.color,
                            hex_code: v.hex_code || '#000000',
                            stock_status: (v.quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
                            product: { id: categoryId, name: product.name ?? '' },
                            product_id: categoryId,
                            fabric: v.fabric || 'Silk'
                        }));
                        setVariants(transformedData);
                        
                        // Set initial price range based on data
                        if (transformedData.length > 0) {
                            const prices = transformedData.map((v) => v.price || 0);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            setPriceRange([min, max]);
                        }
                    }
                }
            } catch {
                setError('Unable to load products. Please try again later.');
                setVariants([]);
            } finally {
                setLoading(false);
            }
        };
        fetchVariants();
    }, [categoryId]);

    // Extract unique fabrics and colors from variants
    const availableFabrics = useMemo(() => {
        const fabrics = Array.from(new Set(variants.map(v => v.fabric).filter(Boolean)));
        return fabrics as string[];
    }, [variants]);

    const availableColors = useMemo(() => {
        const colorMap = new Map<string, string>();
        variants.forEach(v => {
            if (v.color_name && v.hex_code) {
                colorMap.set(v.color_name, v.hex_code);
            }
        });
        return Array.from(colorMap.entries()).map(([name, hex]) => ({ name, hex }));
    }, [variants]);

    // Get min/max prices for filter
    const minPrice = useMemo(() => {
        if (variants.length === 0) return 0;
        return Math.min(...variants.map(v => v.price || 0));
    }, [variants]);

    const maxPrice = useMemo(() => {
        if (variants.length === 0) return 10000;
        return Math.max(...variants.map(v => v.price || 0));
    }, [variants]);

    // Filter and sort variants
    const filteredAndSortedVariants = useMemo(() => {
        // Sanitise the query: lowercase, trim, cap length, strip angle brackets.
        // This value is only ever used for in-memory string matching (never
        // injected into the DOM as HTML), so this is purely defensive.
        const q = searchQuery.toLowerCase().replace(/[<>]/g, "").trim().slice(0, 80);

        const filtered = variants.filter(v => {
            // Search filter (product name + colour name + fabric)
            if (q) {
                const haystack = `${v.product?.name ?? ""} ${v.product_name ?? ""} ${v.color_name ?? ""} ${v.color ?? ""} ${v.fabric ?? ""}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            // Price filter
            if ((v.price ?? 0) < priceRange[0] || (v.price ?? 0) > priceRange[1]) return false;
            
            // Fabric filter
            if (selectedFabrics.length > 0 && !selectedFabrics.includes(v.fabric)) return false;
            
            // Color filter
            if (selectedColors.length > 0 && !selectedColors.includes(v.color_name)) return false;
            
            // Stock filter
            if (!showOutOfStock && v.stock_status === 'out_of_stock') return false;
            
            return true;
        });

        // Sort
        switch (sortBy) {
            case 'price-low-high':
                filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-high-low':
                filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                break;
            case 'name-az':
                filtered.sort((a, b) => (a.color_name || '').localeCompare(b.color_name || ''));
                break;
            case 'name-za':
                filtered.sort((a, b) => (b.color_name || '').localeCompare(a.color_name || ''));
                break;
            default:
                // relevance - keep original order
                break;
        }

        return filtered;
    }, [variants, priceRange, selectedFabrics, selectedColors, showOutOfStock, sortBy, searchQuery]);

    // Count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (priceRange[0] !== minPrice || priceRange[1] !== maxPrice) count++;
        if (selectedFabrics.length > 0) count += selectedFabrics.length;
        if (selectedColors.length > 0) count += selectedColors.length;
        if (!showOutOfStock) count++;
        return count;
    }, [priceRange, selectedFabrics, selectedColors, showOutOfStock, minPrice, maxPrice]);

    // Clear all filters
    const handleClearAllFilters = () => {
        setPriceRange([minPrice, maxPrice]);
        setSelectedFabrics([]);
        setSelectedColors([]);
        setShowOutOfStock(true);
    };

    if (loading) return null;

    return (
        <>
            <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row min-h-screen">
                
                {/* Desktop Filters */}
                <div className="hidden md:block md:w-64 lg:w-72 flex-shrink-0">
                    <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
                        <ProductFilters
                            minPrice={minPrice}
                            maxPrice={maxPrice}
                            priceRange={priceRange}
                            onPriceChange={setPriceRange}
                            availableFabrics={availableFabrics}
                            selectedFabrics={selectedFabrics}
                            onFabricChange={setSelectedFabrics}
                            availableColors={availableColors}
                            selectedColors={selectedColors}
                            onColorChange={setSelectedColors}
                            showOutOfStock={showOutOfStock}
                            onStockChange={setShowOutOfStock}
                            onClearAll={handleClearAllFilters}
                            activeFilterCount={activeFilterCount}
                        />
                    </div>
                </div>

                {/* Mobile Filter Button */}
                <button
                    onClick={() => setShowMobileFilters(true)}
                    className="md:hidden fixed bottom-6 right-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-lg flex items-center gap-2"
                >
                    <Filter size={20} />
                    {activeFilterCount > 0 && (
                        <span className="bg-white text-gray-900 text-xs rounded-full px-2 py-0.5 font-medium">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {/* Mobile Filters Overlay */}
                {showMobileFilters && (
                    <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowMobileFilters(false)}>
                        <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Filters</h2>
                                <button onClick={() => setShowMobileFilters(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                            <ProductFilters
                                minPrice={minPrice}
                                maxPrice={maxPrice}
                                priceRange={priceRange}
                                onPriceChange={setPriceRange}
                                availableFabrics={availableFabrics}
                                selectedFabrics={selectedFabrics}
                                onFabricChange={setSelectedFabrics}
                                availableColors={availableColors}
                                selectedColors={selectedColors}
                                onColorChange={setSelectedColors}
                                showOutOfStock={showOutOfStock}
                                onStockChange={setShowOutOfStock}
                                onClearAll={handleClearAllFilters}
                                activeFilterCount={activeFilterCount}
                            />
                            <div className="p-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-full bg-gray-900 text-white py-3 rounded-md font-medium"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Section */}
                <div className="flex-1 flex flex-col">
                    {/* Search + Sort Bar */}
                    <div className="sticky top-20 md:top-24 z-30 bg-[#FAF9F6] border-b border-[#EAE6D9]">
                        {/* Search */}
                        <div className="px-6 pt-4 pb-1">
                            <label htmlFor="shop-search" className="sr-only">
                                Search sarees by name, colour or fabric
                            </label>
                            <div className="relative max-w-xl">
                                <Search
                                    size={18}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8776] pointer-events-none"
                                />
                                <input
                                    id="shop-search"
                                    type="text"
                                    inputMode="search"
                                    autoComplete="off"
                                    spellCheck={false}
                                    maxLength={80}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search sarees — try “Kanjivaram”, “maroon”, “silk”…"
                                    className="w-full rounded-full border border-[#E0DBCD] bg-white py-3 pl-11 pr-10 text-sm text-[#1A1A1A] placeholder:text-[#A8A294] outline-none transition-colors focus:border-[#9A7B4F] focus:ring-2 focus:ring-[#9A7B4F]/30"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        aria-label="Clear search"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8C8776] hover:bg-[#F4F2EC] hover:text-[#1A1A1A]"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <ProductSort
                            currentSort={sortBy}
                            onSortChange={setSortBy}
                            resultCount={filteredAndSortedVariants.length}
                        />
                    </div>

                    {/* Product Grid */}
                    <div className="px-6 py-8">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <p className="text-red-600 text-lg mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : filteredAndSortedVariants.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-[#5C584E] text-lg mb-4">
                                    {searchQuery
                                        ? `No sarees match “${searchQuery.replace(/[<>]/g, "").slice(0, 40)}”.`
                                        : "No products found"}
                                </p>
                                <button
                                    onClick={() => { handleClearAllFilters(); setSearchQuery(""); }}
                                    className="font-medium text-[#9A7B4F] hover:text-[#1A1A1A] underline-offset-4 hover:underline"
                                >
                                    Clear search & filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                {filteredAndSortedVariants.map((variant, index) => {
                                    const displayPrice = variant.price ? variant.price.toLocaleString('en-IN') : 'Price on Request';
                                    const isNegotiable = variant.is_negotiable;

                                    return (
                                        <a 
                                            href={`/shop/${variant.product_id}/${variant.id}`} 
                                            key={variant.id} 
                                            style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
                                            className="card-in group relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                                        >
                                            {/* Image Container */}
                                            <div className="w-full aspect-[3/4] overflow-hidden bg-gray-100 relative">
                                                {variant.image_url ? (
                                                    <>
                                                        <img
                                                            src={resolveImageUrl(variant.image_url)}
                                                            alt={`${variant.color_name} Saree`}
                                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                            loading="lazy"
                                                            onError={handleImageError}
                                                        />
                                                        {/* Out of Stock Overlay */}
                                                        {variant.stock_status === 'out_of_stock' && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <span className="bg-white text-gray-900 px-4 py-2 rounded-md font-medium text-sm">
                                                                    Out of Stock
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        No Image
                                                    </div>
                                                )}
                                                
                                                {/* Wishlist Button */}
                                                <button className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors">
                                                    <Heart size={18} className="text-gray-700" strokeWidth={1.5} />
                                                </button>

                                                {/* Limited Edition Badge */}
                                                {variant.stock_status === 'limited' && (
                                                    <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
                                                        Limited
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Details */}
                                            <div className="p-3 sm:p-4">
                                                <h3 className="text-[#1A1A1A] font-serif text-sm sm:text-base mb-1 line-clamp-2 leading-snug">
                                                    {variant.color_name} {variant.product?.name || categoryName}
                                                </h3>
                                                
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: variant.hex_code }}
                                                    />
                                                    <span className="text-xs text-[#8C8776] uppercase tracking-wide">{variant.fabric}</span>
                                                </div>
                                                
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[#1A1A1A] font-semibold">
                                                        ₹{displayPrice}
                                                    </div>
                                                    {isNegotiable && variant.price && (
                                                        <span className="text-xs text-[#1F6F54]">Negotiable</span>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                product={selectedVariantForCheckout?.product || null}
                variant={selectedVariantForCheckout}
                onClose={() => {
                    setIsCheckoutOpen(false);
                    setSelectedVariantForCheckout(null);
                }}
            />
        </>
    );
}

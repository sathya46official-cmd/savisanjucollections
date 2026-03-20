"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ChevronLeft, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import CheckoutModal from "@/components/CheckoutModal";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    
    // In Next.js client components using useParams(), params is an object, but sometimes unwrapping is needed using React.use(). 
    // However, useParams() returns the resolved parameters object directly in recent Next.js 15 RC versions for client components.
    const categoryId = params.categoryId as string;
    const variantId = params.variantId as string;

    const [product, setProduct] = useState<any>(null);
    const [variant, setVariant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const [allImages, setAllImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string>("");
    
    // Checkout State
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch Category Details
            const { data: pData } = await supabase
                .from('products')
                .select('*')
                .eq('id', categoryId)
                .single();
                
            if (pData) setProduct(pData);

            // Fetch Variant Details
            const { data: vData } = await supabase
                .from('product_variants')
                .select('*')
                .eq('id', variantId)
                .single();

            if (vData) {
                setVariant(vData);
                const images = [vData.image_url];
                if (vData.additional_images && vData.additional_images.length > 0) {
                    images.push(...vData.additional_images);
                }
                setAllImages(images);
                setSelectedImage(images[0]);
            }
            
            setLoading(false);
        };

        fetchData();
    }, [categoryId, variantId]);

    if (loading) {
        return <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center text-[#8C8776] tracking-widest uppercase">Loading Masterpiece...</div>;
    }

    if (!variant || !product) {
        return <div className="min-h-screen bg-[#F4F2EC] flex items-center justify-center text-red-500 tracking-widest uppercase">Product Not Found</div>;
    }

    return (
        <div className="min-h-screen bg-[#F4F2EC] pt-24 pb-16 px-6 md:px-12 lg:px-24">
            
            <button 
                onClick={() => router.push(`/shop/${categoryId}`)}
                className="flex items-center gap-2 text-sm text-[#8C8776] hover:text-[#1A1A1A] transition-colors mb-8 tracking-widest uppercase"
            >
                <ChevronLeft size={16} /> Back to {product.name}
            </button>

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                
                {/* Left Side: Image Gallery */}
                <div className="flex flex-col-reverse md:flex-row gap-4 h-[600px] lg:h-[800px]">
                    
                    {/* Thumbnails (Vertical on Desktop, Horizontal on Mobile) */}
                    <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto hide-scrollbar w-full md:w-24 flex-shrink-0">
                        {allImages.map((img, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setSelectedImage(img)}
                                className={`w-20 h-24 md:w-full md:h-32 flex-shrink-0 border-2 transition-all ${selectedImage === img ? 'border-[#1A1A1A] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>

                    {/* Main Stage Image */}
                    <div className="flex-1 bg-white relative overflow-hidden group">
                        <img 
                            src={selectedImage} 
                            alt={`${variant.color_name} ${product.name}`} 
                            className="w-full h-full object-cover object-center transition-transform duration-700 ease-in-out group-hover:scale-[1.02]"
                        />
                    </div>
                </div>

                {/* Right Side: Product Details */}
                <div className="flex flex-col py-4">
                    <div className="border-b border-[#EAE6D9] pb-8 mb-8">
                        <div className="text-xs tracking-[0.3em] text-[#8C8776] uppercase mb-4">{product.name} Collection</div>
                        <h1 className="text-4xl lg:text-5xl font-serif text-[#1A1A1A] leading-tight mb-4">
                            {variant.color_name} Heritage Saree
                        </h1>
                        
                        <div className="flex items-end gap-4 mb-4">
                            <span className="text-2xl font-light text-[#1A1A1A]">
                                {variant.price ? `₹ ${variant.price.toLocaleString('en-IN')}` : 'Price on Request'}
                            </span>
                            <span className="text-sm tracking-widest text-[#8C8776] uppercase pb-1">
                                {variant.is_negotiable && variant.price ? '(Price Negotiable)' : (variant.price ? '(Fixed Price)' : '')}
                            </span>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1A1A1A] text-white text-[10px] tracking-widest uppercase">
                            {variant.stock_status.replace('_', ' ')}
                        </div>
                    </div>

                    <div className="prose prose-sm text-[#5C584E] font-light leading-relaxed mb-10">
                        <p>{variant.description || product.description}</p>
                        <p className="mt-4">
                            Woven with absolute precision and care, this masterpiece reflects true elegance. Ideal for festive occasions and evening soirees, bringing a touch of luxury to every drape.
                        </p>
                    </div>

                    <div className="space-y-4 mb-10">
                        <h3 className="text-xs font-medium tracking-[0.2em] text-[#1A1A1A] uppercase">Color Specification</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: variant.hex_code }} />
                            <span className="text-sm text-[#5C584E] lowercase">{variant.color_name}</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button 
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full bg-[#1A1A1A] text-white py-5 tracking-[0.2em] text-sm uppercase hover:bg-[#333] transition-colors flex justify-center items-center gap-3 mb-8"
                    >
                        Secure Checkout <ShieldCheck size={18} />
                    </button>

                    {/* Trust Badges */}
                    <div className="grid grid-cols-2 gap-4 border-t border-[#EAE6D9] pt-8">
                        <div className="flex items-start gap-3">
                            <Truck size={20} className="text-[#8C8776]" strokeWidth={1.5} />
                            <div>
                                <h4 className="text-xs tracking-widest uppercase text-[#1A1A1A] mb-1">Express Delivery</h4>
                                <p className="text-[10px] text-[#8C8776] uppercase">Pan India Shipping Available</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <RotateCcw size={20} className="text-[#8C8776]" strokeWidth={1.5} />
                            <div>
                                <h4 className="text-xs tracking-widest uppercase text-[#1A1A1A] mb-1">Authenticity</h4>
                                <p className="text-[10px] text-[#8C8776] uppercase">100% Original Premium Quality verified</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <CheckoutModal 
                isOpen={isCheckoutOpen}
                product={{ id: categoryId, name: product.name }}
                variant={{ ...variant, product_name: product.name }}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </div>
    );
}

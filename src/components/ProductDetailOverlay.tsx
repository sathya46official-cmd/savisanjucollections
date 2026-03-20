"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { X } from "lucide-react";

interface Variant {
    id: string;
    product_id: string;
    color_name: string;
    hex_code: string;
    image_url: string;
    stock_status: string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    variants: Variant[];
}

interface ProductDetailOverlayProps {
    product: Product | null;
    initialVariantIndex: number;
    startCheckout?: boolean;
    onClose: () => void;
    onBuyNow: (variant: Variant) => void;
}

export default function ProductDetailOverlay({
    product,
    initialVariantIndex,
    startCheckout,
    onClose,
    onBuyNow
}: ProductDetailOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [activeVariantIdx, setActiveVariantIdx] = useState(initialVariantIndex);

    // Update active variant if initial changes (e.g. reopening)
    useEffect(() => {
        setActiveVariantIdx(initialVariantIndex);
    }, [initialVariantIndex]);

    useEffect(() => {
        if (product && overlayRef.current && contentRef.current) {
            // Animate In Sequence
            const tl = gsap.timeline();
            tl.to(overlayRef.current, {
                clipPath: "circle(150% at 50% 50%)",
                duration: 1,
                ease: "power3.inOut"
            })
            .fromTo(contentRef.current.children, 
                { y: 50, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power2.out" },
                "-=0.5"
            );
            
            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // Auto-open checkout if requested via prop (came back from login)
            if (startCheckout) {
                // Wait for entrance animation to finish before popping up Modal
                setTimeout(() => {
                    const activeVariant = product.variants[activeVariantIdx];
                    if(activeVariant) onBuyNow(activeVariant);
                }, 1200);
            }
            
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [product, startCheckout]); // Removed activeVariantIdx dependency intentionally

    const handleClose = () => {
        if (overlayRef.current) {
            gsap.to(overlayRef.current, {
                clipPath: "circle(0% at 50% 50%)",
                duration: 0.8,
                ease: "power3.inOut",
                onComplete: onClose
            });
        }
    };

    if (!product) return null;

    const activeVariant = product.variants[activeVariantIdx];
    const bgColor = activeVariant?.hex_code || "#F4F2EC"; // Default fallback

    return (
        <div 
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-colors duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ 
                backgroundColor: bgColor,
                clipPath: "circle(0% at 50% 50%)" // Start hidden for entrance animation
            }}
        >
            <button 
                onClick={handleClose}
                className="absolute top-8 right-8 z-50 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition"
            >
                <X size={24} />
            </button>

            {/* Massive Background Typography */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <h1 className="text-[15vw] font-black text-white/20 leading-none select-none uppercase tracking-tighter whitespace-nowrap">
                    {product.name}
                </h1>
            </div>

            <div ref={contentRef} className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between h-full py-20">
                
                {/* Left Column: Details */}
                <div className="md:w-1/3 text-white flex flex-col items-start gap-4">
                    <h2 className="text-5xl md:text-7xl font-serif leading-tight">
                        Timeless<br/>Grace
                    </h2>
                    <p className="text-lg md:text-xl font-light text-white/80 max-w-sm">
                        {product.description || "Experience the artistry of elegant Indian sarees, perfect for every occasion."}
                    </p>
                </div>

                {/* Center Column: Saree Image */}
                <div className="md:w-1/3 flex justify-center items-center h-[50vh] md:h-[80vh] relative z-20">
                    <img 
                        src={activeVariant?.image_url} 
                        alt={`${product.name} - ${activeVariant?.color_name}`} 
                        className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-700 ease-in-out"
                    />
                </div>

                {/* Right Column: Selectors */}
                <div className="md:w-1/3 flex flex-col items-end gap-8 text-white">
                    <div className="flex flex-col items-end gap-4">
                        <span className="text-sm tracking-widest uppercase opacity-80">Selector Flavor</span>
                        <div className="flex gap-4">
                            {product.variants.map((v, idx) => (
                                <button 
                                    key={v.id}
                                    onClick={() => setActiveVariantIdx(idx)}
                                    className={`relative rounded-full w-16 h-16 flex flex-col items-center justify-center gap-2 transition overflow-visible group`}
                                >
                                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${activeVariantIdx === idx ? 'border-white scale-110 drop-shadow-lg' : 'border-transparent opacity-60 group-hover:opacity-100'}`}>
                                        <img src={v.image_url} alt={v.color_name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="absolute -bottom-6 text-xs whitespace-nowrap opacity-60 font-light tracking-wide">{v.color_name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button 
                            onClick={() => onBuyNow(activeVariant)}
                            className="bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-black hover:text-white transition shadow-lg"
                        >
                            Shop Now
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

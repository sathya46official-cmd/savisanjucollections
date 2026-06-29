"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingBag } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function HeroCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLowPerformance, setIsLowPerformance] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Detect mobile and performance
    useEffect(() => {
        // Check if mobile device
        const checkMobile = () => {
            const mobile = window.matchMedia('(max-width: 768px)').matches;
            setIsMobile(mobile);
        };

        // Check device performance
        const checkPerformance = () => {
            // Check for low-end devices
            const isLowEnd = 
                // Limited CPU cores
                (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                // Limited memory (< 4GB)
                ((navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
                    (navigator as Navigator & { deviceMemory?: number }).deviceMemory! < 4) ||
                // Mobile device
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            setIsLowPerformance(isLowEnd);
        };

        checkMobile();
        checkPerformance();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Preload images with lazy loading
    useEffect(() => {
        const frameCount = 72;
        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;

        // Use Intersection Observer for lazy loading
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Start loading images when hero section is visible
                        for (let i = 1; i <= frameCount; i++) {
                            const img = new Image();
                            const frameIndex = i.toString().padStart(3, "0");
                            img.src = `/assets/hero-sequence/ezgif-frame-${frameIndex}.jpg`;
                            img.onload = () => {
                                loadedCount++;
                                if (loadedCount === frameCount) {
                                    setIsLoaded(true);
                                }
                            };
                            loadedImages.push(img);
                        }
                        setImages(loadedImages);
                        observer.disconnect();
                    }
                });
            },
            { rootMargin: '100px' } // Start loading 100px before visible
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useGSAP(
        () => {
            if (!isLoaded || !canvasRef.current || images.length === 0) return;

            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            if (!context) return;

            // Set initial canvas size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const render = (index: number) => {
                const img = images[index];
                if (img) {
                    // Calculate usage to cover the canvas (object-fit: cover equivalent)
                    const hRatio = canvas.width / img.width;
                    const vRatio = canvas.height / img.height;
                    const ratio = Math.max(hRatio, vRatio);
                    const centerShift_x = (canvas.width - img.width * ratio) / 2;
                    const centerShift_y = (canvas.height - img.height * ratio) / 2;

                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(
                        img,
                        0,
                        0,
                        img.width,
                        img.height,
                        centerShift_x,
                        centerShift_y,
                        img.width * ratio,
                        img.height * ratio
                    );
                }
            };

            // Initial render
            let currentFrame = 0;
            render(0);

            // A small scrub smooths the link between scroll position and frame
            // without the lag that a large value introduces. Frame skipping is
            // removed because it was the main cause of the visible stutter —
            // canvas drawImage is cheap enough to run every update.
            const scrubValue = isLowPerformance ? 0.8 : 0.5;
            const pinDuration = isMobile ? "+=80%" : "+=100%";

            const trigger = ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: pinDuration,
                pin: true,
                scrub: scrubValue,
                anticipatePin: 1,
                fastScrollEnd: true,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const frameIndex = Math.round(self.progress * (images.length - 1));
                    if (frameIndex !== currentFrame) {
                        currentFrame = frameIndex;
                        // Schedule the draw on the next frame to avoid layout thrash.
                        requestAnimationFrame(() => render(frameIndex));
                    }
                },
            });

            // Handle resizing — re-draw the current frame so the canvas never
            // flashes blank after the width/height reset. Mobile browsers fire
            // resize while scrolling (address bar show/hide); only react to
            // width changes so we don't re-trigger pin maths mid-scroll.
            let lastWidth = window.innerWidth;
            const handleResize = () => {
                const w = window.innerWidth;
                canvas.width = w;
                canvas.height = window.innerHeight;
                render(currentFrame);
                if (w !== lastWidth) {
                    lastWidth = w;
                    ScrollTrigger.refresh();
                }
            };

            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                trigger.kill();
            };
        },
        { scope: containerRef, dependencies: [isLoaded, images, isMobile, isLowPerformance] }
    );

    return (
        <div ref={containerRef} className="relative w-full h-screen overflow-hidden bg-black">
            <canvas
                ref={canvasRef}
                className="block w-full h-full object-cover"
            />

            {/* Elegant Header purely for the landing page */}
            <header className="absolute top-0 left-0 w-full py-8 text-white z-30 flex items-center justify-between px-8 md:px-16 pointer-events-auto">
                <div className="text-2xl font-serif tracking-widest uppercase drop-shadow-md">
                    SaviSanju
                </div>
                <nav className="hidden md:flex gap-8 text-xs uppercase tracking-[0.3em] items-center">
                    <a href="#collections" className="hover:text-white/70 transition-colors">Collections</a>
                    <Link href="/shop" className="hover:text-white/70 transition-colors">Sarees</Link>
                    <Link href="/auth" className="hover:text-white/70 transition-colors">Account</Link>
                    <Link href="/orders" className="hover:text-white/70 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </Link>
                </nav>

                {/* Mobile menu trigger */}
                <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    className="md:hidden p-2 -mr-2 text-white drop-shadow-md"
                >
                    <Menu size={26} strokeWidth={1.5} />
                </button>
            </header>

            {/* Mobile full-screen nav overlay (landing) */}
            <div
                className={`fixed inset-0 z-[70] md:hidden transition-all duration-500 ${
                    menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
            >
                <div className="absolute inset-0 bg-[#1A1A1A]/97 backdrop-blur-sm" />
                <div className="relative flex h-full flex-col">
                    <div className="flex items-center justify-between px-8 py-8">
                        <span className="text-2xl font-serif uppercase tracking-widest text-[#F4F2EC]">
                            SaviSanju
                        </span>
                        <button
                            type="button"
                            onClick={() => setMenuOpen(false)}
                            aria-label="Close menu"
                            className="p-2 -mr-2 text-[#F4F2EC]"
                        >
                            <X size={28} strokeWidth={1.5} />
                        </button>
                    </div>

                    <nav className="flex flex-1 flex-col justify-center gap-2 px-8">
                        <a
                            href="#collections"
                            onClick={() => setMenuOpen(false)}
                            className="border-b border-white/10 py-5 font-serif text-3xl text-[#F4F2EC] transition-colors hover:text-[#C9A227]"
                        >
                            Collections
                        </a>
                        <Link
                            href="/shop"
                            onClick={() => setMenuOpen(false)}
                            className="border-b border-white/10 py-5 font-serif text-3xl text-[#F4F2EC] transition-colors hover:text-[#C9A227]"
                        >
                            Sarees
                        </Link>
                        <Link
                            href="/auth"
                            onClick={() => setMenuOpen(false)}
                            className="border-b border-white/10 py-5 font-serif text-3xl text-[#F4F2EC] transition-colors hover:text-[#C9A227]"
                        >
                            Account
                        </Link>
                        <Link
                            href="/orders"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-3 py-5 font-serif text-3xl text-[#F4F2EC] transition-colors hover:text-[#C9A227]"
                        >
                            <ShoppingBag size={26} strokeWidth={1.5} /> Orders
                        </Link>
                    </nav>

                    <p className="px-8 py-10 text-xs uppercase tracking-[0.3em] text-white/40">
                        Handwoven Luxury Sarees
                    </p>
                </div>
            </div>

            {/* Overlay Typography */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 bg-black/30">
                <h2 className="text-white/80 text-sm md:text-base tracking-[0.5em] uppercase mb-6 drop-shadow-lg">
                    Welcome to
                </h2>
                <h1 className="text-white text-5xl md:text-7xl lg:text-9xl font-serif text-center drop-shadow-2xl">
                    SaviSanju <br />
                    <span className="italic font-light opacity-90 text-4xl md:text-6xl lg:text-8xl mt-4 block">Collections</span>
                </h1>
                
                <div className="absolute bottom-12 flex flex-col items-center animate-bounce opacity-70">
                    <span className="text-white text-xs tracking-[0.3em] uppercase mb-2">Scroll To Explore</span>
                    <div className="w-[1px] h-12 bg-white" />
                </div>
            </div>

            {/* Loading Indicator */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-20">
                    <p className="font-serif animate-pulse">Loading Experience...</p>
                </div>
            )}
        </div>
    );
}

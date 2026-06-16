"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
            render(0);

            const scrubValue = isLowPerformance ? 2 : 1;
            const pinDuration = isMobile ? "+=80%" : "+=100%";

            const trigger = ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: pinDuration,
                pin: true,
                scrub: scrubValue,
                onUpdate: (self) => {
                    const frameSkip = isLowPerformance ? 2 : 1;
                    const frameIndex = Math.round(self.progress * (images.length - 1));
                    
                    if (frameIndex % frameSkip === 0 || frameIndex === images.length - 1) {
                        render(frameIndex);
                    }
                },
            });

            // Handle resizing
            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
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
            </header>

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

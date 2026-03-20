"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function HeroCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Preload images
    useEffect(() => {
        const frameCount = 72;
        const loadedImages: HTMLImageElement[] = [];
        let loadedCount = 0;

        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            // Ensure specific frame naming: ezgif-frame-001.jpeg to 072.jpeg
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

            // const frameObj = { frame: 0 }; // Unused

            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: "+=300%", // Pin for 3 screen heights
                pin: true,
                scrub: 1, // Smooth scrubbing
                onUpdate: (self) => {
                    const frameIndex = Math.round(self.progress * (images.length - 1));
                    render(frameIndex);
                },
            });

            // Handle resizing
            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                // Re-render current frame? logic gets complex, simplest is to let scroll update handle it or force generic re-render of frame 0 if stuck. 
                // For now, rely on scroll update or just re-render last known frame if tracked.
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        },
        { scope: containerRef, dependencies: [isLoaded, images] }
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
                <nav className="hidden md:flex gap-8 text-xs uppercase tracking-[0.3em]">
                    <a href="#collections" className="hover:text-white/70 transition-colors">Collections</a>
                    <a href="/shop" className="hover:text-white/70 transition-colors">Sarees</a>
                    <a href="/auth" className="hover:text-white/70 transition-colors">Account</a>
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

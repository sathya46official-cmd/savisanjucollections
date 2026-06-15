import { Suspense } from "react";
import Link from "next/link";
import ShopGridClient from "@/components/ShopGridClient";
import { Metadata } from "next";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const BASE_URL = "https://savisanjucollections.vercel.app";

export const metadata: Metadata = {
  title: "Buy Premium Sarees Online – Kanjivaram & Banarasi Collection",
  description:
    "Shop our complete collection of handwoven Kanjivaram and Banarasi sarees. Authentic luxury sarees with pan-India delivery. Price negotiable.",
  alternates: { canonical: `${BASE_URL}/shop` },
  openGraph: {
    title: "Buy Premium Sarees Online | SaviSanju Collections",
    description:
      "Authentic handwoven Kanjivaram and Banarasi sarees. Pan-India delivery.",
    url: `${BASE_URL}/shop`,
    type: "website",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "All Sarees", item: `${BASE_URL}/shop` },
  ],
};

export default function AllShopPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
            {/* Elegant Header */}
            <header className="w-full py-8 border-b border-[#EAE6D9] bg-white sticky top-0 z-40 flex items-center justify-between px-8 md:px-16">
                <Link href="/" className="text-2xl font-serif tracking-widest text-[#1A1A1A]">
                    SaviSanju<span className="text-[#8C8776]">Collections</span>
                </Link>
                <nav className="hidden md:flex gap-8 text-sm uppercase tracking-widest text-[#5C584E]">
                    <Link href="/" className="hover:text-[#1A1A1A] transition-colors">Home</Link>
                    <Link href="/shop" className="text-[#1A1A1A]">Sarees</Link>
                    <Link href="/auth" className="hover:text-[#1A1A1A] transition-colors">Account</Link>
                </nav>
            </header>

            {/* Luxurious Hero Banner for Category */}
            <div className="relative w-full h-[40vh] md:h-[50vh] bg-[#EAE6D9] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#D7D1C4]/50 to-[#EAE6D9]/50 mix-blend-multiply" />
                <div className="z-10 text-center px-4">
                    <h1 className="text-4xl md:text-6xl font-serif text-[#1A1A1A] tracking-wider mb-4">
                        All Sarees
                    </h1>
                    <p className="text-[#5C584E] max-w-2xl mx-auto text-sm md:text-base leading-relaxed tracking-wide font-light">
                        Discover the complete master collection of timeless elegance from SaviSanju.
                    </p>
                </div>
            </div>

            {/* Main Shop Layout */}
            <Suspense fallback={<div className="h-screen flex items-center justify-center text-[#8C8776] tracking-widest">LOADING COLLECTION...</div>}>
                <ShopGridClient categoryId="all" categoryName="Master" />
            </Suspense>
        </main>
    );    
}

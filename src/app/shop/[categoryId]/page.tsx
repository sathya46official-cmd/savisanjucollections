import { Suspense } from "react";
import Link from "next/link";
import ShopGridClient from "@/components/ShopGridClient";
import { Metadata } from "next";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const BASE_URL = "https://savisanjucollections.me";

export async function generateMetadata(
    { params }: { params: Promise<{ categoryId: string }> }
): Promise<Metadata> {
    const { categoryId } = await params;
    
    try {
        const response = await fetch(`${API_URL}/api/products/${categoryId}`, { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            const title = `${data?.name || 'Shop'} Sarees`;
            const description = `Buy authentic handwoven ${data?.name || ''} sarees online. Premium quality, pan-India delivery. ${data?.description || 'Explore our luxury collection.'}`;
            const canonicalUrl = `${BASE_URL}/shop/${categoryId}`;
            return {
                title,
                description,
                alternates: { canonical: canonicalUrl },
                openGraph: {
                    title: `${title} | SaviSanju Collections`,
                    description,
                    url: canonicalUrl,
                    type: "website",
                    siteName: "SaviSanju Collections",
                    locale: "en_IN",
                },
                twitter: {
                    card: "summary_large_image",
                    title,
                    description,
                },
            };
        }
    } catch (error) {
        console.error('Error fetching category metadata:', error);
    }
    
    return {
        title: 'Shop Sarees Online',
        description: 'Explore our premium collection of elegant handwoven sarees.',
        alternates: { canonical: `${BASE_URL}/shop` },
    };
}

export default async function ShopCategoryPage(
    { params }: { params: Promise<{ categoryId: string }> }
) {
    const { categoryId } = await params;
    
    // We pre-fetch the category name on the server
    let category = null;
    try {
        const response = await fetch(`${API_URL}/api/products/${categoryId}`, { cache: 'no-store' });
        if (response.ok) {
            category = await response.json();
        }
    } catch (error) {
        console.error('Error fetching category:', error);
    }

    return (
        <main className="min-h-screen bg-[#FAF9F6]">
            {/* Breadcrumb + ItemList structured data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: safeJsonLd({
                        "@context": "https://schema.org",
                        "@graph": [
                            {
                                "@type": "BreadcrumbList",
                                itemListElement: [
                                    { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
                                    { "@type": "ListItem", position: 2, name: "All Sarees", item: `${BASE_URL}/shop` },
                                    { "@type": "ListItem", position: 3, name: category?.name || "Collection", item: `${BASE_URL}/shop/${categoryId}` },
                                ],
                            },
                            {
                                "@type": "CollectionPage",
                                name: `${category?.name || "Sarees"} Collection`,
                                description: category?.description || "Premium handwoven sarees",
                                url: `${BASE_URL}/shop/${categoryId}`,
                            },
                        ],
                    }),
                }}
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

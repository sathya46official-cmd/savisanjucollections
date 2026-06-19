import { Suspense } from "react";
import ShopGridClient from "@/components/ShopGridClient";
import SiteHeader from "@/components/SiteHeader";
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
            <SiteHeader />

            {/* Category Banner - scrolls normally, only navbar is sticky */}
            <div className="relative w-full h-[16vh] md:h-[20vh] bg-[#EAE6D9] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#D7D1C4]/50 to-[#EAE6D9]/50 mix-blend-multiply" />
                <div className="z-10 text-center px-4">
                    <h1 className="text-3xl md:text-5xl font-serif text-[#1A1A1A] tracking-wider mb-2">
                        {category?.name || 'Sarees'}
                    </h1>
                    <p className="text-[#5C584E] max-w-2xl mx-auto text-xs md:text-sm leading-relaxed tracking-wide font-light">
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

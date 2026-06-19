import { Suspense } from "react";
import ShopGridClient from "@/components/ShopGridClient";
import SiteHeader from "@/components/SiteHeader";
import { Metadata } from "next";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const BASE_URL = "https://savisanjucollections.me";

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
      <SiteHeader />

      {/* Category Banner - scrolls normally, not sticky */}
      <div className="relative w-full h-[16vh] md:h-[20vh] bg-[#EAE6D9] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D7D1C4]/50 to-[#EAE6D9]/50 mix-blend-multiply" />
        <div className="z-10 text-center px-4">
          <h1 className="text-3xl md:text-5xl font-serif text-[#1A1A1A] tracking-wider mb-2">
            All Sarees
          </h1>
          <p className="text-[#5C584E] max-w-2xl mx-auto text-xs md:text-sm leading-relaxed tracking-wide font-light">
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

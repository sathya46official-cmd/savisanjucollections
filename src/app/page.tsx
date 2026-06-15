import type { Metadata } from "next";
import HeroCanvas from "@/components/HeroCanvas";
import SmoothFadeTransition from "@/components/TornPaperDivider";
import CollectionAccordion from "@/components/CollectionAccordion";

const BASE_URL = "https://savisanjucollections.me";

export const metadata: Metadata = {
  title: "SaviSanju Collections – Premium Kanjivaram & Banarasi Sarees",
  description:
    "Shop authentic handwoven Kanjivaram and Banarasi sarees online. Premium quality, pan-India delivery, price negotiable. Trusted luxury saree boutique.",
  alternates: { canonical: BASE_URL },
  openGraph: {
    title: "SaviSanju Collections – Premium Kanjivaram & Banarasi Sarees",
    description:
      "Shop authentic handwoven Kanjivaram and Banarasi sarees online. Premium quality, pan-India delivery.",
    url: BASE_URL,
    type: "website",
    siteName: "SaviSanju Collections",
    locale: "en_IN",
    images: [
      {
        url: "/assets/collection/saree1.jpeg",
        width: 1200,
        height: 630,
        alt: "SaviSanju Collections – Premium Handwoven Sarees",
      },
    ],
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F2EC]">
      {/* SEO-visible content for crawlers (visually hidden but accessible) */}
      <h1 className="sr-only">
        SaviSanju Collections – Premium Handwoven Kanjivaram and Banarasi Sarees
      </h1>
      <p className="sr-only">
        Buy authentic handwoven Kanjivaram and Banarasi sarees online. We offer premium quality
        silk sarees with pan-India delivery. Price negotiable. Explore our luxury saree collection
        including Crape Silk, Tussar, and more.
      </p>

      <HeroCanvas />

      {/* Elegant fade transition block overlapping the canvas bottom */}
      <SmoothFadeTransition />

      <CollectionAccordion />
    </main>
  );
}

import type { Metadata } from "next";
import HeroCanvas from "@/components/HeroCanvas";
import SmoothFadeTransition from "@/components/TornPaperDivider";
import CollectionAccordion from "@/components/CollectionAccordion";
import { safeJsonLd } from "@/lib/seo/jsonLd";

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
  // WebSite schema with a SearchAction enables a Google sitelinks search box
  // and tells AI engines the site is searchable at /shop?q=…
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SaviSanju Collections",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // FAQ structured data — heavily used by AI answer engines (ChatGPT,
  // Perplexity, Google AI Overviews) for citations, and eligible for FAQ
  // rich results. Answers mirror the facts in /llms.txt.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What types of sarees does SaviSanju Collections sell?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We sell authentic handwoven silk sarees including Kanjivaram, Banarasi, Crape Silk, and Tussar sarees, sourced directly for customers across India.",
        },
      },
      {
        "@type": "Question",
        name: "Does SaviSanju Collections deliver across India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. We offer pan-India delivery with an estimated delivery time of 5–6 business days.",
        },
      },
      {
        "@type": "Question",
        name: "Are saree prices negotiable?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, prices are negotiable. Our team contacts each customer to confirm the final price before processing the order. Typical prices range from ₹1,500 to ₹3,500 per saree.",
        },
      },
      {
        "@type": "Question",
        name: "How can I pay for my saree?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Payment is available via Cash on Delivery (COD) or UPI after you confirm satisfaction with the order.",
        },
      },
      {
        "@type": "Question",
        name: "Are the sarees authentic and handwoven?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every saree is authentic and handwoven — Kanjivaram sarees are woven in Kanchipuram and Banarasi sarees in Varanasi with traditional zari work.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F4F2EC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />

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

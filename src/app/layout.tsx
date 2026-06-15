import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://savisanjucollections.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "SaviSanju Collections – Premium Kanjivaram & Banarasi Sarees",
    template: "%s | SaviSanju Collections",
  },
  description:
    "Shop authentic handwoven Kanjivaram and Banarasi sarees online. Premium quality, pan-India delivery, price negotiable. Trusted luxury saree boutique.",
  keywords: [
    "Kanjivaram saree",
    "Banarasi saree",
    "buy saree online",
    "luxury saree",
    "handwoven saree",
    "silk saree",
    "premium saree India",
    "SaviSanju Collections",
  ],
  authors: [{ name: "SaviSanju Collections" }],
  creator: "SaviSanju Collections",
  publisher: "SaviSanju Collections",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "SaviSanju Collections – Premium Kanjivaram & Banarasi Sarees",
    description:
      "Shop authentic handwoven Kanjivaram and Banarasi sarees online. Premium quality, pan-India delivery.",
    url: BASE_URL,
    siteName: "SaviSanju Collections",
    images: [
      {
        url: "/assets/collection/saree1.jpeg",
        width: 1200,
        height: 630,
        alt: "SaviSanju Collections – Premium Handwoven Sarees",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SaviSanju Collections – Premium Sarees",
    description:
      "Authentic handwoven Kanjivaram & Banarasi sarees. Pan-India delivery.",
    images: ["/assets/collection/saree1.jpeg"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    // Add your Google Search Console verification token here after setup:
    // 1. Go to https://search.google.com/search-console
    // 2. Add property → URL prefix → https://savisanjucollections.vercel.app
    // 3. Choose "HTML tag" verification method
    // 4. Copy the content value and paste below
    // google: "paste-your-token-here",
  },
};

// Organization structured data (JSON-LD) — helps Google understand your business
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: "SaviSanju Collections",
  url: BASE_URL,
  logo: `${BASE_URL}/assets/collection/saree1.jpeg`,
  description:
    "Premium handwoven Kanjivaram and Banarasi sarees. Authentic luxury sarees with pan-India delivery.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "support@savisanju.com",
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts and Analytics for faster LCP */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <link rel="preconnect" href="https://www.googletagmanager.com" />
        )}
        {/* Google Analytics — replace G-XXXXXXXXXX with your actual Measurement ID */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        {/* Organization structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}

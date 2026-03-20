import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaviSanjuCollections - Luxury Premium Sarees",
  description: "Experience the timeless grace and artistry of elegant Indian sarees. Browse our premium collection of Kanjivaram, Banarasi, and more.",
  openGraph: {
    title: "SaviSanjuCollections - Luxury Premium Sarees",
    description: "Experience the timeless grace and artistry of elegant Indian sarees.",
    url: "https://savisanjucollections.vercel.app",
    siteName: "SaviSanjuCollections",
    images: [
      {
        url: "/assets/collection/saree1.jpeg",
        width: 1200,
        height: 630,
        alt: "SaviSanjuCollections Luxury Saree",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SaviSanjuCollections - Luxury Sarees",
    description: "Experience the timeless grace and artistry of elegant Indian sarees.",
    images: ["/assets/collection/saree1.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}

import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const BASE_URL = "https://savisanjucollections.vercel.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface PageProps {
  params: Promise<{ categoryId: string; variantId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoryId, variantId } = await params;

  try {
    const [productRes, variantRes] = await Promise.all([
      fetch(`${API_URL}/api/products/${categoryId}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/products/variants/${variantId}`, { cache: 'no-store' }),
    ]);

    if (!productRes.ok || !variantRes.ok) return {};

    const product = await productRes.json();
    const variant = await variantRes.json();

    const title = `${variant.color} ${product.name} Saree`;
    const description = variant.description || product.description ||
      `Buy authentic ${variant.color} ${product.name} handwoven saree. Premium quality, pan-India delivery. Price: ${variant.price ? `₹${(variant.price / 100).toLocaleString("en-IN")}` : "on request"}.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${BASE_URL}/shop/${categoryId}/${variantId}`,
      },
      openGraph: {
        title: `${title} | SaviSanju Collections`,
        description,
        url: `${BASE_URL}/shop/${categoryId}/${variantId}`,
        images: variant.image_url
          ? [{ url: variant.image_url, width: 800, height: 1000, alt: title }]
          : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: variant.image_url ? [variant.image_url] : [],
      },
    };
  } catch (error) {
    return {};
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { categoryId, variantId } = await params;

  try {
    const [productRes, variantRes] = await Promise.all([
      fetch(`${API_URL}/api/products/${categoryId}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/products/variants/${variantId}`, { cache: 'no-store' }),
    ]);

    if (!productRes.ok || !variantRes.ok) notFound();

    const product = await productRes.json();
    const variant = await variantRes.json();

    // Transform variant to match expected format
    const transformedVariant = {
      ...variant,
      color_name: variant.color,
      stock_status: variant.quantity > 0 ? 'in_stock' : 'out_of_stock',
    };

    // Product structured data (JSON-LD) — makes Google show price/availability in search results
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${variant.color} ${product.name} Saree`,
      description: variant.description || product.description,
      image: variant.image_url,
      sku: variantId,
      category: `${product.name} Sarees`,
      brand: {
        "@type": "Brand",
        name: "SaviSanju Collections",
      },
      offers: {
        "@type": "Offer",
        url: `${BASE_URL}/shop/${categoryId}/${variantId}`,
        priceCurrency: "INR",
        price: variant.price ? variant.price / 100 : undefined,
        availability:
          variant.quantity > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: "SaviSanju Collections",
        },
        priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      },
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "All Sarees", item: `${BASE_URL}/shop` },
        { "@type": "ListItem", position: 3, name: product.name, item: `${BASE_URL}/shop/${categoryId}` },
        { "@type": "ListItem", position: 4, name: `${variant.color} ${product.name}`, item: `${BASE_URL}/shop/${categoryId}/${variantId}` },
      ],
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
        />
        <ProductDetailClient
          product={product}
          variant={transformedVariant}
          categoryId={categoryId}
        />
      </>
    );
  } catch (error) {
    notFound();
  }
}

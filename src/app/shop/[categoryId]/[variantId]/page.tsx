import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import { safeJsonLd } from "@/lib/seo/jsonLd";

const BASE_URL = "https://savisanjucollections.me";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface PageProps {
  params: Promise<{ categoryId: string; variantId: string }>;
}

interface ApiProduct {
  id: string;
  name: string;
  description?: string;
}

interface ApiVariant {
  id: string;
  color: string;
  description?: string;
  price?: number;
  image_url: string;
  quantity?: number;
  is_negotiable?: boolean;
  hex_code?: string;
  additional_images?: string[];
  product_id?: string;
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
  } catch {
    return {};
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { categoryId, variantId } = await params;

  let product: ApiProduct;
  let variant: ApiVariant;

  try {
    const [productRes, variantRes] = await Promise.all([
      fetch(`${API_URL}/api/products/${categoryId}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/products/variants/${variantId}`, { cache: 'no-store' }),
    ]);

    if (!productRes.ok || !variantRes.ok) notFound();

    product = await productRes.json();
    variant = await variantRes.json();
  } catch {
    notFound();
  }

  // Transform variant to match expected format
  const transformedVariant = {
    ...variant,
    color_name: variant.color,
    stock_status: (variant.quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
  };

  // Build an absolute image URL (schema.org requires absolute URLs).
  const rawImage = variant.image_url || "";
  const absoluteImage = /^https?:\/\//i.test(rawImage)
    ? rawImage
    : rawImage
      ? `${BASE_URL}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
      : `${BASE_URL}/assets/collection/saree1.jpeg`;

  const priceInRupees = variant.price ? variant.price / 100 : undefined;
  const inStock = (variant.quantity ?? 0) > 0;

  // Product structured data (JSON-LD) — makes Google show price/availability in
  // search results and gives AI answer engines a clean, citable product record.
  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${BASE_URL}/shop/${categoryId}/${variantId}#product`,
    name: `${variant.color} ${product.name} Saree`,
    description:
      variant.description ||
      product.description ||
      `Authentic handwoven ${variant.color} ${product.name} saree from SaviSanju Collections.`,
    image: [absoluteImage],
    sku: variantId,
    mpn: variantId,
    category: `${product.name} Sarees`,
    color: variant.color,
    material: "Silk",
    itemCondition: "https://schema.org/NewCondition",
    brand: {
      "@type": "Brand",
      name: "SaviSanju Collections",
    },
  };

  // Only emit an Offer when we have a real price — an Offer without a price is
  // invalid structured data and can trigger Search Console errors.
  if (priceInRupees !== undefined) {
    productSchema.offers = {
      "@type": "Offer",
      url: `${BASE_URL}/shop/${categoryId}/${variantId}`,
      priceCurrency: "INR",
      price: priceInRupees,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "SaviSanju Collections",
      },
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split("T")[0],
    };
  }

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
}

import { MetadataRoute } from "next";

const BASE_URL = "https://savisanjucollections.vercel.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    // Dynamic product category pages
    const response = await fetch(`${API_URL}/api/products`, { 
      next: { revalidate: 3600 }, // revalidate every hour
      signal: AbortSignal.timeout(5000) // 5 second timeout — don't block build if API is down
    });
    
    if (response.ok) {
      const products = await response.json();

      for (const product of products) {
        // Category page
        routes.push({
          url: `${BASE_URL}/shop/${product.id}`,
          lastModified: new Date(product.updated_at || new Date()),
          changeFrequency: "weekly",
          priority: 0.8,
        });

        // Individual variant/product pages
        if (product.variants) {
          for (const variant of product.variants) {
            routes.push({
              url: `${BASE_URL}/shop/${product.id}/${variant.id}`,
              lastModified: new Date(variant.updated_at || new Date()),
              changeFrequency: "weekly",
              priority: 0.7,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Sitemap generation error:", e);
  }

  return routes;
}

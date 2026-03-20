import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://savisanjucollections.vercel.app'; // Update this to your real domain later

    // 1. Add static public routes
    const routes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/auth`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        }
    ];

    try {
        // 2. Add dynamic product routes from Supabase
        const { data: products } = await supabase
            .from('products')
            .select(`
                id,
                updated_at,
                variants:product_variants (id)
            `);

        if (products) {
            products.forEach((product) => {
                // If a product has variants, add it to the sitemap specifically directing to its checkout view 
                // Since our current design uses an overlay on the home page, the "URLs" to a specific saree 
                // in this architecture rely on the ?checkout= parameter that we built in Phase 5.
                
                if (product.variants && product.variants.length > 0) {
                    const primaryVariant = product.variants[0];
                    routes.push({
                        url: `${baseUrl}/?checkout=${primaryVariant.id}`,
                        lastModified: new Date(product.updated_at || new Date()),
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                }
            });
        }
    } catch (e) {
        console.error("Sitemap generation error:", e);
    }

    return routes;
}

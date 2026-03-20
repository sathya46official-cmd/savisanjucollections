import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://savisanjucollections.vercel.app'; // Change to your actual domain

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/auth/'], // Block search engines from indexing the secure admin panel and login screen
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}

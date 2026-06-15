import { MetadataRoute } from "next";

const BASE_URL = "https://savisanjucollections.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow all standard crawlers
      {
        userAgent: "*",
        allow: ["/", "/shop", "/shop/*"],
        disallow: ["/admin/", "/auth/", "/checkout/", "/orders/", "/api/"],
      },
      // Explicitly allow AI search bots so they can cite us
      { userAgent: "GPTBot", allow: ["/", "/shop", "/shop/*"] },
      { userAgent: "ChatGPT-User", allow: ["/", "/shop", "/shop/*"] },
      { userAgent: "PerplexityBot", allow: ["/", "/shop", "/shop/*"] },
      { userAgent: "ClaudeBot", allow: ["/", "/shop", "/shop/*"] },
      { userAgent: "anthropic-ai", allow: ["/", "/shop", "/shop/*"] },
      { userAgent: "Google-Extended", allow: ["/", "/shop", "/shop/*"] },
      // Block Common Crawl (training data harvester, not a search engine)
      { userAgent: "CCBot", disallow: ["/"] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

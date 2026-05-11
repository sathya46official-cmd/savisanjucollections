import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from the Express backend (local dev + production VPS)
  // TODO: Set NEXT_PUBLIC_API_HOSTNAME environment variable to your Oracle VPS domain before deploying
  images: {
    remotePatterns: [
      {
        // Local development backend
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        // Production Oracle VPS — reads from NEXT_PUBLIC_API_HOSTNAME env var
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_API_HOSTNAME || "your-oracle-vps-domain.com",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Security headers — also help with SEO trust signals
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/assets/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

  // Power header removal (minor security improvement)
  poweredByHeader: false,
};

export default nextConfig;

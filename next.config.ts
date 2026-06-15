import type { NextConfig } from "next";

// Build the list of allowed image hostnames dynamically
type RemotePattern = { protocol: "http" | "https"; hostname: string; port?: string; pathname?: string };

const remotePatterns: RemotePattern[] = [
  {
    // Local development backend
    protocol: "http",
    hostname: "localhost",
    port: "5000",
    pathname: "/uploads/**",
  },
];

// Only add the production VPS pattern if the hostname is actually configured
const vpsHostname = process.env.NEXT_PUBLIC_API_HOSTNAME;
if (vpsHostname && vpsHostname !== "localhost" && vpsHostname !== "your-oracle-vps-domain.com") {
  remotePatterns.push({
    protocol: "https",
    hostname: vpsHostname,
    pathname: "/uploads/**",
  });
}

const nextConfig: NextConfig = {
  // Allow images from the Express backend (local dev + production VPS)
  // Set NEXT_PUBLIC_API_HOSTNAME in Vercel env vars once you have your Oracle VPS domain
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
  },

  // Security headers — applied to ALL routes (CSP + HSTS are no longer limited
  // to the middleware's auth-only matcher, so public pages get them too).
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    let apiOrigin = "";
    try {
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      apiOrigin = "";
    }

    const isProduction = process.env.NODE_ENV === "production";

    // 'unsafe-eval' is only needed by dev tooling (React Fast Refresh); never in prod.
    // 'unsafe-inline' is kept for the inline GA bootstrap snippet (JSON-LD is
    // type="application/ld+json" and is not executed, so it is unaffected).
    const scriptSrc = isProduction
      ? "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https://www.google-analytics.com https://www.googletagmanager.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: csp },
    ];

    if (isProduction) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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

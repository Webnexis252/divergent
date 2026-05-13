import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Increase in-memory cache to reduce disk writes during dev
  cacheMaxMemorySize: 0,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.figma.com",
        pathname: "/api/mcp/asset/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "fgizpokcubuaatgeguzt.supabase.co",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      }
    ],
  },
  turbopack: {
    root: path.join(__dirname),
  },
  // ─── Security Headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://*.daily.co https://*.upstash.io",
              "frame-src 'self' https://meet.jit.si https://*.jit.si https://*.daily.co https://checkout.razorpay.com https://zoho.in https://*.zoho.in https://zoho.com https://*.zoho.com https://www.youtube.com https://youtube.com https://player.vimeo.com https://vimeo.com https://drive.google.com",
              "media-src 'self' https://*.supabase.co blob: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          // Prevent MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Clickjacking protection
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Referrer policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // XSS protection (legacy browsers)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // HSTS — enable in production
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=*, microphone=*, screen-wake-lock=*, geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

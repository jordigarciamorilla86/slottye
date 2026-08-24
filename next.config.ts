import type {
  NextConfig,
} from "next";

const isDevelopment =
  process.env.NODE_ENV ===
  "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js y styled-jsx generan actualmente bloques inline. Migrar a nonces
  // permitiria retirar unsafe-inline de script-src y style-src.
  `script-src 'self' 'unsafe-inline'${
    isDevelopment
      ? " 'unsafe-eval'"
      : ""
  } https://maps.googleapis.com https://maps.gstatic.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://*.gstatic.com${
    isDevelopment
      ? " ws://localhost:*"
      : ""
  }`,
  "frame-src 'self' https://accounts.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const privateRouteHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root:
      process.cwd(),
  },

  async headers() {
    return [
      {
        source:
          "/(.*)",
        headers:
          securityHeaders,
      },
      ...[
        "/account/:path*",
        "/admin/:path*",
        "/business-dashboard/:path*",
        "/api/:path*",
        "/auth/:path*",
        "/login",
        "/check-email",
        "/forgot-password",
        "/reset-password",
      ].map((source) => ({
        source,
        headers: privateRouteHeaders,
      })),
    ];
  },
};

export default nextConfig;

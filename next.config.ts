import type { NextConfig } from "next";

// Supabase host (auth + token endpoints the browser talks to). Derived from the
// public env var so connect-src stays correct across environments; falls back to
// a wildcard *.supabase.co when it isn't set (e.g. local boot before provisioning).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseConnect = supabaseUrl ? new URL(supabaseUrl).origin : "https://*.supabase.co";

// Conservative CSP. 'unsafe-inline' is required by Next.js's inline runtime
// bootstrap and styled JSX; everything else is locked to self + the few hosts we
// actually call. frame-ancestors 'none' is the modern anti-clickjacking control.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseConnect} https://*.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Force HTTPS for a year (and allow preload-list inclusion).
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Google account avatars (used in the navbar) loaded via next/image.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

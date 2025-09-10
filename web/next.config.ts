import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ["src"],
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors during build
  },
  serverExternalPackages: ["inngest", "@supabase/supabase-js"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Allow importing code from the monorepo root (e.g., ../inngest/*)
    externalDir: true,
  },
  images: {
    domains: ["localhost"],
  },
  // Configure for Vercel deployment
  output: "standalone",
};

export default nextConfig;

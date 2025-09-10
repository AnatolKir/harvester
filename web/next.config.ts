import type { NextConfig } from "next";
import path from "path";

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
  // Silence monorepo root inference warning by pinning root
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;

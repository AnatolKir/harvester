import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ["src"],
    ignoreDuringBuilds: true, // Temporarily ignore ESLint errors during build
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Allow importing code from the monorepo root (e.g., ../inngest/*)
    externalDir: true,
    // Ensure these packages are handled correctly in server components
    serverComponentsExternalPackages: ["inngest", "@supabase/supabase-js"],
  },
  images: {
    domains: ["localhost"],
  },
  // Configure for Vercel deployment
  output: "standalone",
};

export default nextConfig;

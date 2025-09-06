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
  },
  images: {
    domains: ["localhost"],
  },
  // Configure for Vercel deployment
  output: "standalone",
};

export default nextConfig;
